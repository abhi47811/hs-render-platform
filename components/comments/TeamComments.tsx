'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { TeamComment } from '@/types/database'

interface TeamCommentsProps {
  projectId: string
  roomId?: string
}

export function TeamComments({ projectId, roomId }: TeamCommentsProps) {
  const [comments, setComments] = useState<(TeamComment & { profile?: any })[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Load comments on mount
  useEffect(() => {
    const loadComments = async () => {
      try {
        const query = supabase
          .from('team_comments')
          .select('*, profile:user_id(full_name, avatar_url)')
          .eq('project_id', projectId)

        if (roomId) {
          query.eq('room_id', roomId)
        } else {
          query.is('room_id', null)
        }

        const { data, error } = await query.order('created_at', { ascending: true })

        if (error) throw error
        setComments(data || [])
      } catch (err) {
        console.error('Failed to load comments:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [projectId, roomId])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team_comments:${projectId}:${roomId || 'project'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_comments',
          filter: roomId
            ? `project_id=eq.${projectId} AND room_id=eq.${roomId}`
            : `project_id=eq.${projectId} AND room_id=is.null`,
        },
        (payload) => {
          // Fetch profile separately if needed
          setComments((prev) => [...prev, payload.new as TeamComment & { profile?: any }])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, roomId])

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('team_comments').insert({
        project_id: projectId,
        room_id: roomId || null,
        user_id: user.id,
        content: newComment,
        mentioned_users: [],
      })

      if (error) throw error

      setNewComment('')
      scrollToBottom()
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (fullName?: string) => {
    if (!fullName) return '?'
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
    ]
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  if (isLoading) {
    return (
      <div className="w-full h-96 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center">
        <p className="text-sm text-stone-500">Loading comments...</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col h-screen max-h-[600px] rounded-lg border border-stone-200 bg-white overflow-hidden">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {comments.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-8">No comments yet. Start a discussion!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg p-3 border border-stone-100">
              <div className="flex items-start gap-3">
                <div
                  className={`${getAvatarColor(comment.user_id)} text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold`}
                >
                  {getInitials(comment.profile?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-stone-900">
                      {comment.profile?.full_name || 'Unknown User'}
                    </p>
                    <span className="text-xs text-stone-500 flex-shrink-0">
                      {format(new Date(comment.created_at), 'dd MMM, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 break-words">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="border-t border-stone-200 bg-white p-4 flex-shrink-0">
        <div className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a team comment..."
            maxLength={500}
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
