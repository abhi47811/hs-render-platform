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
    /* max-h to prevent this from dominating the page; no h-screen */
    <div className="w-full flex flex-col max-h-[420px] bg-stone-50/50">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {comments.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-xs text-stone-400">No comments yet</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <div
                className={`${getAvatarColor(comment.user_id)} text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold`}
              >
                {getInitials(comment.profile?.full_name)}
              </div>
              <div className="flex-1 min-w-0 bg-white rounded-xl rounded-tl-sm border border-stone-100 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-stone-800">
                    {comment.profile?.full_name || 'Team Member'}
                  </p>
                  <span className="text-[10px] text-stone-400 flex-shrink-0 tabular-nums">
                    {format(new Date(comment.created_at), 'dd MMM, h:mm a')}
                  </span>
                </div>
                <p className="text-xs text-stone-700 break-words leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="border-t border-stone-200 bg-white p-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a note…"
            maxLength={500}
            className="flex-1 px-3 py-2.5 min-h-[44px] border border-stone-200 rounded-lg text-xs bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400 transition-colors"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 min-h-[44px] bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
