import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { EmptyState } from '../components/EmptyState'
import { Header } from '../components/Header'
import { ResponsiveContainer } from '../components/ResponsiveContainer'
import { Skeleton } from '../components/Skeleton'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications
} from '../hooks/useNotifications'
import { formatDateTime } from '../lib/format'
import { useAuthStore } from '../store/authStore'
import { colors, radius } from '../theme'
import { AppNotification } from '../types/models'

/** Where tapping a notification should land, per role. Shared across AdminStack and
 * ParticipantStack (each has its own param-list type), so navigation here is loosely
 * typed on purpose — this one screen is mounted in both stacks. */
function resolveTarget (
  notification: AppNotification,
  role: 'admin' | 'participant' | undefined
): { screen: string; params?: Record<string, unknown> } | null {
  const data = notification.data ?? {}
  if (role === 'admin') {
    switch (notification.type) {
      case 'reimbursement_submitted':
        return { screen: 'Tabs', params: { screen: 'Verifikasi', params: { section: 'klaim' } } }
      case 'report_submitted':
        return { screen: 'Tabs', params: { screen: 'Verifikasi', params: { section: 'laporan' } } }
      case 'full_semester_report_submitted':
        return { screen: 'Tabs', params: { screen: 'Verifikasi', params: { section: 'lengkap' } } }
      case 'pin_reset_requested':
        return data.participantId
          ? { screen: 'ParticipantDetail', params: { participantId: data.participantId } }
          : null
      default:
        return null
    }
  }
  if (role === 'participant') {
    switch (notification.type) {
      case 'reimbursement_reviewed':
        return { screen: 'Tabs', params: { screen: 'Klaim' } }
      case 'report_reviewed':
      case 'full_semester_report_reviewed':
        return { screen: 'Tabs', params: { screen: 'Laporan' } }
      case 'disbursement_created':
      case 'transfer_proof_created':
        return { screen: 'Tabs', params: { screen: 'Beranda' } }
      case 'scholarship_type_updated':
      case 'pin_reset_reviewed':
        return { screen: 'Tabs', params: { screen: 'Profil' } }
      default:
        return null
    }
  }
  return null
}

export function NotificationScreen () {
  const navigation = useNavigation<any>()
  const role = useAuthStore(s => s.user?.role)
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const hasUnread = !!notifications?.some(n => !n.read)

  const onPressNotification = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification.id)
    const target = resolveTarget(notification, role)
    if (target) navigation.navigate(target.screen, target.params)
  }

  return (
    <View style={styles.screen}>
      <Header
        variant={role === 'admin' ? 'admin' : 'participant'}
        title='Notifikasi'
        onBack={navigation.goBack}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.navy}
            colors={[colors.navy]}
          />
        }
      >
        <ResponsiveContainer>
          {hasUnread ? (
            <Pressable
              style={styles.markAllRow}
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Text style={styles.markAllText}>Tandai semua dibaca</Text>
            </Pressable>
          ) : null}

          {isLoading ? (
            <>
              <Skeleton height={64} radiusSize={radius.md} style={styles.item} />
              <Skeleton height={64} radiusSize={radius.md} style={styles.item} />
              <Skeleton height={64} radiusSize={radius.md} style={styles.item} />
            </>
          ) : !notifications || notifications.length === 0 ? (
            <EmptyState
              icon='notifications-outline'
              title='Belum ada notifikasi'
              subtitle='Aktivitas terbaru akan muncul di sini.'
            />
          ) : (
            notifications.map(notification => (
              <Pressable
                key={notification.id}
                style={[styles.item, !notification.read && styles.itemUnread]}
                onPress={() => onPressNotification(notification)}
              >
                <View style={styles.itemTop}>
                  {!notification.read ? <View style={styles.dot} /> : null}
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {notification.title}
                  </Text>
                </View>
                {notification.body ? (
                  <Text style={styles.itemBody} numberOfLines={3}>
                    {notification.body}
                  </Text>
                ) : null}
                <Text style={styles.itemDate}>{formatDateTime(notification.createdAt)}</Text>
              </Pressable>
            ))
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  markAllRow: {
    alignSelf: 'flex-end',
    marginBottom: 12
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.royal
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10
  },
  itemUnread: {
    borderWidth: 1,
    borderColor: colors.royal
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.royal
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  itemBody: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 17
  },
  itemDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8
  }
})
