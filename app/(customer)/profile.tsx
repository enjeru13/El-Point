import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppText } from '@/components/ui/AppText';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { Field } from '@/components/ui/Field';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StarRow } from '@/components/ui/StarRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { useMyProfile, useMyReviews, useUpdateMyProfile, levelProgress } from '@/lib/queries/me';
import { RankBadge } from '@/components/ui/RankBadge';
import { Button } from '@/components/ui/Button';
import { uploadAvatar } from '@/lib/storage';
import { useFavorites } from '@/lib/queries/feed';
import { useToast } from '@/lib/toast';

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

  const profileQ = useMyProfile();
  const reviewsQ = useMyReviews();
  const favoritesQ = useFavorites();

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

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setFullName(profile.full_name ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  function cancelEdit() {
    if (profile) {
      setUsername(profile.username ?? '');
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
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
      { username: u || null, full_name: fullName.trim() || null, bio: bio.trim() || null },
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

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <ScreenHeader
        left={<AppLogo />}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, backgroundColor: C.surface }}
            >
              <Icon name="settings" size={20} color={C.onSurface} />
            </Pressable>
            <NotificationBell />
          </View>
        }
      />

      {profileQ.isLoading ? (
        <View style={{ padding: 20, gap: 20 }}>
          <View style={{ alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 28, padding: 24, borderWidth: 2, borderColor: C.border, ...shadow.md }}>
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
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 20, gap: 20 }}>

            {/* Card perfil */}
            <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: C.border, ...shadow.md }}>
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
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                    <Icon name="camera-plus-outline" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                    <AppText variant="caption" style={{ fontSize: 12 }}>{level}</AppText>
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
            <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 20, gap: 12, borderWidth: 2, borderColor: C.border, ...shadow.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 6 }}>
                  <AppText variant="overline" color={C.onSurfaceVariant}>NIVEL {level}</AppText>
                  <RankBadge level={level} size="md" />
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border }}>
                  <AppText variant="subtitle" color={C.primary} style={{ fontFamily: 'Outfit_700Bold' }}>{xp} XP</AppText>
                </View>
              </View>
              <XPBar pct={pct} />
              <AppText variant="label" color={C.onSurfaceVariant}>
                {next - xp > 0 ? `${next - xp} XP para el nivel ${level + 1}` : `¡Listo para subir de nivel!`}
              </AppText>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { icon: 'medal', value: reviews.length, label: 'Ranks', color: C.primaryContainer },
                { icon: 'heart', value: favorites.length, label: 'Favoritos', color: C.secondary },
              ].map(stat => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 24, padding: 20, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
                  <Icon name={stat.icon} size={28} color={stat.color} />
                  <AppText variant="title">{stat.value}</AppText>
                  <AppText variant="label" color={C.onSurfaceVariant}>{stat.label}</AppText>
                </View>
              ))}
            </View>

            {/* Favoritos */}
            <View style={{ gap: 12 }}>
              <SectionTitle icon="heart" label="Favoritos" />
              {favoritesQ.isLoading ? (
                <SkeletonList count={2} kind="row" />
              ) : favorites.length === 0 ? (
                <AppText variant="bodySm" color={C.outline}>
                  Marca "Me sirve" en las reseñas para guardar lugares aquí.
                </AppText>
              ) : (
                <View style={{ gap: 10 }}>
                  {favorites.map(f => (
                    <Pressable
                      key={f.id}
                      onPress={() => router.push(`/restaurant/${f.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.sm }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
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
                <AppText variant="bodySm" color={C.outline}>
                  Aún no has rankeado ningún lugar.
                </AppText>
              ) : (
                reviews.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => r.restaurant && router.push(`/restaurant/${r.restaurant.id}`)}
                    style={{ backgroundColor: C.surface, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 14, borderWidth: 2, borderColor: C.border, ...shadow.sm }}
                  >
                    <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, flexShrink: 0 }}>
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
