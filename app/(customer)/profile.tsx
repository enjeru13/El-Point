import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppText } from '@/components/ui/AppText';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StarRow } from '@/components/ui/StarRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { useMyProfile, useMyReviews, useUpdateMyProfile, levelProgress } from '@/lib/queries/me';
import { useMyMissions, MISSIONS } from '@/lib/queries/missions';
import { RankBadge } from '@/components/ui/RankBadge';
import { Button } from '@/components/ui/Button';
import { Chip, Tag } from '@/components/ui/Chip';
import { uploadAvatar } from '@/lib/storage';
import { useFavorites } from '@/lib/queries/feed';
import { useCategories } from '@/lib/queries/categories';
import { useToast } from '@/lib/toast';
import { capWidth, useIsTablet } from '@/lib/responsive';

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (d <= 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  const w = Math.floor(d / 7);
  if (w < 5) return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  return `Hace ${Math.floor(d / 30)} mes`;
}

function XPBar({ pct }: { pct: number }) {
  const { C } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 900, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height: 12, borderRadius: 99, overflow: 'hidden', backgroundColor: C.primaryFixed }}>
      <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: C.primaryContainer, width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export default function ProfileScreen() {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const profileQ = useMyProfile();
  const reviewsQ = useMyReviews();
  const favoritesQ = useFavorites();
  const categoriesQ = useCategories();
  const missionsQ = useMyMissions();

  const updateMut = useUpdateMyProfile();
  const toast = useToast();

  const profile = profileQ.data ?? null;
  const reviews = reviewsQ.data ?? [];
  const favorites = favoritesQ.data ?? [];

  const name = profile?.username ? `@${profile.username}` : profile?.full_name ?? 'Comensal';
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const { next, pct } = levelProgress(level, xp);

  const [editing, setEditing]   = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio]           = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [favCats, setFavCats] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setFullName(profile.full_name ?? '');
    setBio(profile.bio ?? '');
    setFavCats(new Set(profile.favorite_categories));
  }, [profile]);

  // Orden estable mientras se edita: las ya elegidas (al entrar a editar)
  // van primero, para no tener que buscarlas entre todas. No se recalcula
  // con cada toque, para que los chips no salten de lugar al seleccionar.
  const editSortedCats = useMemo(() => {
    const data = categoriesQ.data ?? [];
    const persisted = new Set(profile?.favorite_categories ?? []);
    return [...data].sort((a, b) => Number(persisted.has(b.id)) - Number(persisted.has(a.id)));
  }, [categoriesQ.data, profile]);

  function toggleFavCat(id: number) {
    setFavCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function cancelEdit() {
    if (profile) {
      setUsername(profile.username ?? '');
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setFavCats(new Set(profile.favorite_categories));
    }
    setEditing(false);
  }

  function saveEdit() {
    const u = username.trim();
    if (u && !/^[a-z0-9_.]{3,20}$/i.test(u)) {
      toast.error('Usuario: solo letras, números, punto y guion bajo (3–20).');
      return;
    }
    updateMut.mutate(
      {
        username: u || null,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        favorite_categories: Array.from(favCats),
      },
      {
        onSuccess: () => { setEditing(false); toast.success('Perfil actualizado'); },
        onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
      },
    );
  }

  async function pickAvatar() {
    if (!profile) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (r.canceled) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(profile.id, r.assets[0].uri);
      updateMut.mutate({ avatar_url: url });
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo subir el avatar');
    } finally {
      setAvatarUploading(false);
    }
  }

  const busy = updateMut.isPending;

  const refreshing =
    profileQ.isRefetching || reviewsQ.isRefetching || favoritesQ.isRefetching;
  function onRefresh() {
    profileQ.refetch();
    reviewsQ.refetch();
    favoritesQ.refetch();
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        left={<AppLogo />}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}
            >
              <Icon name="settings" size={20} color={C.onSurface} />
            </Pressable>
            <NotificationBell />
          </View>
        }
      />

      {profileQ.isLoading ? (
        <View style={{ padding: 20, gap: 20 }}>
          <View style={{ alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: C.border, ...shadow.md }}>
            <Skeleton width={88} height={88} radius={44} />
            <Skeleton width={140} height={22} />
            <Skeleton width={200} height={14} />
            <Skeleton width={130} height={40} radius={20} />
          </View>
          <Skeleton height={116} radius={28} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton height={110} radius={24} style={{ flex: 1 }} />
            <Skeleton height={110} radius={24} style={{ flex: 1 }} />
          </View>
          <SkeletonList count={2} kind="row" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 96, ...capWidth(isTablet) }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
          }
        >
          <View style={{ padding: 20, gap: 20 }}>

            {/* Card perfil */}
            <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, ...shadow.md }}>
              <Pressable onPress={editing ? pickAvatar : undefined} style={{ position: 'relative' }}>
                <View style={{ width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.border }}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                  ) : (
                    <Icon name="account" size={48} color={C.primary} />
                  )}
                  {avatarUploading && (
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}
                </View>
                {editing ? (
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Icon name="camera-plus-outline" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <AppText variant="caption" color={C.onPrimary} style={{ fontSize: 12 }}>{level}</AppText>
                  </View>
                )}
              </Pressable>

              {editing ? (
                <View style={{ alignSelf: 'stretch', gap: 10 }}>
                  <Field icon="account" placeholder="usuario" autoCapitalize="none" value={username} onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_.]/gi, ''))} />
                  <Field icon="pencil-outline" placeholder="Nombre" value={fullName} onChangeText={setFullName} />
                  <Field placeholder="Cuéntanos sobre ti…" multiline value={bio} onChangeText={setBio} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }}>{name}</AppText>
                  <AppText variant="body" color={C.onSurfaceVariant} align="center">
                    {profile?.bio ?? 'Comensal de El Point'}
                  </AppText>
                </View>
              )}

              {editing ? (
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                  <Button label="Cancelar" onPress={cancelEdit} disabled={busy} variant="secondary" size="sm" fullWidth={false} style={{ flex: 1 }} />
                  <Button label="Guardar" onPress={saveEdit} loading={busy} icon="check" size="sm" fullWidth={false} style={{ flex: 1 }} />
                </View>
              ) : (
                <Button label="Editar perfil" onPress={() => setEditing(true)} variant="secondary" size="sm" icon="pencil-outline" />
              )}
            </View>

            {/* Nivel / XP */}
            <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 20, gap: 12, borderWidth: 1, borderColor: C.border, ...shadow.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 6 }}>
                  <AppText variant="overline" color={C.onSurfaceVariant}>NIVEL {level}</AppText>
                  <RankBadge level={level} size="md" />
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border }}>
                  <AppText variant="subtitle" color={C.primary} style={{ fontFamily: 'Outfit_700Bold' }}>{xp} XP</AppText>
                </View>
              </View>
              <XPBar pct={pct} />
              <AppText variant="label" color={C.onSurfaceVariant}>
                {next - xp > 0 ? `${next - xp} XP para el nivel ${level + 1}` : `¡Listo para subir de nivel!`}
              </AppText>

              <View style={{ height: 1, backgroundColor: C.outlineVariant }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon
                  name="fire"
                  size={18}
                  color={(profile?.streak_weeks ?? 0) > 0 ? C.primary : C.outline}
                />
                <AppText variant="label" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                  {(profile?.streak_weeks ?? 0) > 0
                    ? `Racha: ${profile!.streak_weeks} ${profile!.streak_weeks === 1 ? 'semana' : 'semanas'} rankeando`
                    : 'Sin racha. Rankea esta semana para empezar una.'}
                </AppText>
                {(profile?.streak_best ?? 0) > 1 && (
                  <AppText variant="caption" color={C.outline}>
                    récord {profile!.streak_best}
                  </AppText>
                )}
              </View>

              <Pressable
                onPress={() => router.push('/rank-info')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                hitSlop={8}
              >
                <Icon name="information-outline" size={14} color={C.primary} />
                <AppText variant="caption" color={C.primary}>
                  ¿Cómo funcionan los rangos y el XP?
                </AppText>
              </Pressable>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { icon: 'medal', value: reviews.length, label: 'Ranks' },
                { icon: 'heart', value: favorites.length, label: 'Favoritos' },
              ].map(stat => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 24, padding: 20, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Icon name={stat.icon} size={20} color={C.primary} />
                  </View>
                  <AppText variant="title">{stat.value}</AppText>
                  <AppText variant="label" color={C.onSurfaceVariant}>{stat.label}</AppText>
                </View>
              ))}
            </View>

            {/* Logros */}
            <View style={{ gap: 12 }}>
              <SectionTitle
                icon="trophy-outline"
                label={`Logros · ${missionsQ.data?.size ?? 0}/${MISSIONS.length}`}
              />
              <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 16, gap: 10, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
                {MISSIONS.map((m) => {
                  const done = missionsQ.data?.has(m.key) ?? false;
                  return (
                    <View
                      key={m.key}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: done ? 1 : 0.5 }}
                    >
                      <View style={{
                        width: 38, height: 38, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: done ? C.primary + '22' : C.surfaceContainerHighest,
                        borderWidth: 1, borderColor: done ? C.primary + '55' : C.outlineVariant,
                      }}>
                        <Icon name={done ? m.icon : 'lock-outline'} size={18} color={done ? C.primary : C.outline} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{m.title}</AppText>
                        <AppText variant="caption" color={C.outline} style={{ fontSize: 12 }}>
                          {m.description}
                        </AppText>
                      </View>
                      <AppText variant="label" color={done ? C.primary : C.outline}>
                        +{m.xp}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Perfil de sabor */}
            <View style={{ gap: 12 }}>
              <SectionTitle icon="silverware-fork-knife" label="Tu perfil de sabor" />
              <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 18, gap: 12, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
                {categoriesQ.isLoading ? (
                  <Skeleton height={32} radius={16} />
                ) : editing ? (
                  <>
                    <AppText variant="bodySm" color={C.onSurfaceVariant}>
                      Elige tus categorías favoritas.
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8 }}>
                      {editSortedCats.map(cat => (
                        <Chip
                          key={cat.id}
                          label={cat.label}
                          icon={cat.icon}
                          tone="secondary"
                          active={favCats.has(cat.id)}
                          onPress={() => toggleFavCat(cat.id)}
                        />
                      ))}
                    </View>
                  </>
                ) : favCats.size === 0 ? (
                  <AppText variant="bodySm" color={C.outline}>
                    Aún no elegiste tus categorías favoritas. Toca "Editar perfil" para elegirlas.
                  </AppText>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8 }}>
                    {(categoriesQ.data ?? [])
                      .filter(cat => favCats.has(cat.id))
                      .map(cat => (
                        <Tag key={cat.id} label={cat.label} icon={cat.icon} tone="accent" />
                      ))}
                  </View>
                )}
              </View>
            </View>

            {/* Favoritos */}
            <View style={{ gap: 12 }}>
              <SectionTitle icon="heart" label="Favoritos" />
              {favoritesQ.isLoading ? (
                <SkeletonList count={2} kind="row" />
              ) : favorites.length === 0 ? (
                <EmptyState
                  icon="heart-outline"
                  title="Sin favoritos todavía"
                  body="Toca 'Me gusta' en un lugar para guardarlo aquí."
                  actionLabel="Explorar lugares"
                  onAction={() => router.push('/(customer)/search')}
                />
              ) : (
                <View style={{ gap: 10 }}>
                  {favorites.map(f => (
                    <Pressable
                      key={f.id}
                      onPress={() => router.push(`/restaurant/${f.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                        {f.cover_url ? (
                          <Image source={{ uri: f.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                        ) : (
                          <Icon name={f.categories[0]?.icon ?? 'silverware-fork-knife'} size={24} color={C.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>{f.name}</AppText>
                        {f.address && <AppText variant="caption" color={C.outline} numberOfLines={1}>{f.address}</AppText>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Icon name="star" size={13} color={C.secondary} />
                        <AppText variant="label">
                          {f.rating_avg > 0 ? f.rating_avg.toFixed(1) : '–'}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Últimas reseñas */}
            <View style={{ gap: 12 }}>
              <SectionTitle icon="comment-text" label="Mis reseñas" />
              {reviewsQ.isLoading ? (
                <SkeletonList count={2} kind="row" />
              ) : reviews.length === 0 ? (
                <EmptyState
                  icon="comment-text-multiple"
                  title="Aún no has rankeado nada"
                  body="Visita un local y deja tu primera reseña para ganar XP."
                  actionLabel="Buscar dónde comer"
                  onAction={() => router.push('/(customer)/search')}
                />
              ) : (
                reviews.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => r.restaurant && router.push(`/restaurant/${r.restaurant.id}`)}
                    style={{ backgroundColor: C.surface, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: C.border, ...shadow.sm }}
                  >
                    <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, flexShrink: 0 }}>
                      <Icon name={r.restaurant?.icon ?? 'silverware-fork-knife'} size={28} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {r.restaurant?.name ?? 'Local'}
                        </AppText>
                        <StarRow rating={r.rating} />
                      </View>
                      <AppText variant="body" color={C.onSurfaceVariant} numberOfLines={2}>
                        {r.body}
                      </AppText>
                      <AppText variant="label" color={C.outline}>
                        {timeAgo(r.created_at)}
                      </AppText>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

          </View>
        </ScrollView>
      )}
    </View>
  );
}
