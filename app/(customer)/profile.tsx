import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StarRow } from '@/components/ui/StarRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { useMyProfile, useMyReviews, useUpdateMyProfile, levelProgress } from '@/lib/queries/me';
import { uploadAvatar } from '@/lib/storage';
import { useFavorites } from '@/lib/queries/feed';

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
      Alert.alert('Usuario inválido', 'Solo letras, números, punto y guion bajo (3–20).');
      return;
    }
    updateMut.mutate(
      { username: u || null, full_name: fullName.trim() || null, bio: bio.trim() || null },
      {
        onSuccess: () => setEditing(false),
        onError: (e: any) => Alert.alert('No se pudo guardar', e?.message ?? 'Intenta de nuevo'),
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
      Alert.alert('No se pudo subir el avatar', e?.message ?? 'Intenta de nuevo');
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
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
                    <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 12 }}>{level}</Text>
                  </View>
                )}
              </Pressable>

              {editing ? (
                <View style={{ alignSelf: 'stretch', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, height: 48, paddingHorizontal: 14, borderWidth: 2, borderColor: C.border, backgroundColor: C.surfaceContainerLow }}>
                    <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>@</Text>
                    <AppTextInput value={username} onChangeText={setUsername} placeholder="usuario" autoCapitalize="none" style={{ fontSize: 15 }} />
                  </View>
                  <View style={{ borderRadius: 14, height: 48, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 2, borderColor: C.border, backgroundColor: C.surfaceContainerLow }}>
                    <AppTextInput value={fullName} onChangeText={setFullName} placeholder="Nombre" style={{ fontSize: 15 }} />
                  </View>
                  <View style={{ borderRadius: 14, minHeight: 64, padding: 14, borderWidth: 2, borderColor: C.border, backgroundColor: C.surfaceContainerLow }}>
                    <AppTextInput value={bio} onChangeText={setBio} placeholder="Cuéntanos sobre ti…" multiline style={{ fontSize: 15, textAlignVertical: 'top' }} />
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>{name}</Text>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, textAlign: 'center' }}>
                    {profile?.bio ?? 'Comensal de El Point'}
                  </Text>
                </View>
              )}

              {editing ? (
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                  <Pressable
                    onPress={cancelEdit}
                    disabled={busy}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 99, borderWidth: 2, borderColor: C.outlineVariant }}
                  >
                    <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveEdit}
                    disabled={busy}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 99, backgroundColor: C.primary, borderWidth: 2, borderColor: C.border, ...shadow.sm }}
                  >
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={15} color="#fff" />}
                    <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Guardar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border, justifyContent: 'center' }}
                >
                  <Icon name="pencil-outline" size={16} color={C.primary} />
                  <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Editar perfil</Text>
                </Pressable>
              )}
            </View>

            {/* Nivel / XP */}
            <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 20, gap: 12, borderWidth: 2, borderColor: C.border, ...shadow.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, letterSpacing: 1 }}>NIVEL ACTUAL</Text>
                  <Text style={{ color: C.primary, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>Nivel {level}</Text>
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border }}>
                  <Text style={{ color: C.primary, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>{xp} XP</Text>
                </View>
              </View>
              <XPBar pct={pct} />
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                {next - xp > 0 ? `${next - xp} XP para el nivel ${level + 1}` : `¡Listo para subir de nivel!`}
              </Text>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { icon: 'medal', value: reviews.length, label: 'Ranks', color: C.primaryContainer },
                { icon: 'heart', value: favorites.length, label: 'Favoritos', color: C.secondary },
              ].map(stat => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 24, padding: 20, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
                  <Icon name={stat.icon} size={28} color={stat.color} />
                  <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>{stat.value}</Text>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Favoritos */}
            <View style={{ gap: 12 }}>
              <SectionTitle icon="heart" label="Favoritos" />
              {favoritesQ.isLoading ? (
                <View style={{ paddingVertical: 24 }}><ActivityIndicator color={C.primary} /></View>
              ) : favorites.length === 0 ? (
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 }}>
                  Marca "Me sirve" en las reseñas para guardar lugares aquí.
                </Text>
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
                        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }} numberOfLines={1}>{f.name}</Text>
                        {f.address && <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }} numberOfLines={1}>{f.address}</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Icon name="star" size={13} color={C.secondary} />
                        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>
                          {f.rating_avg > 0 ? f.rating_avg.toFixed(1) : '–'}
                        </Text>
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
                <View style={{ paddingVertical: 24 }}><ActivityIndicator color={C.primary} /></View>
              ) : reviews.length === 0 ? (
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 }}>
                  Aún no has rankeado ningún lugar.
                </Text>
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
                        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }} numberOfLines={1}>
                          {r.restaurant?.name ?? 'Local'}
                        </Text>
                        <StarRow rating={r.rating} />
                      </View>
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
                        {r.body}
                      </Text>
                      <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                        {timeAgo(r.created_at)}
                      </Text>
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
