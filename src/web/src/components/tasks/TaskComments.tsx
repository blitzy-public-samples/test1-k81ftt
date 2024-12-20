/**
 * @fileoverview TaskComments component for managing task comments with real-time updates
 * Implements WCAG 2.1 Level AA compliance, offline support, and optimistic updates
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns'; // v2.30.0
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import useWebSocket from '../../hooks/useWebSocket';
import { EventType } from '../../../backend/src/types/event.types';

// Constants for comment management
const COMMENT_MAX_LENGTH = 2000;
const RETRY_INTERVALS = [2000, 5000, 10000, 30000, 60000];
const MENTION_PATTERN = /@[\w-]+/g;

// Styled components with accessibility enhancements
const CommentsContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  maxHeight: '600px',
  overflowY: 'auto',
  scrollBehavior: 'smooth',
  
  // Ensure keyboard focus is visible
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  
  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },
}));

const CommentItem = styled('article')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const CommentContent = styled('div')(({ theme }) => ({
  flex: 1,
  '& .comment-header': {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  '& .comment-author': {
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.primary,
  },
  '& .comment-timestamp': {
    color: theme.palette.text.secondary,
    fontSize: theme.typography.caption.fontSize,
  },
  '& .comment-text': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  '& .comment-actions': {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
}));

// Component interfaces
interface TaskCommentsProps {
  taskId: string;
  currentUser: User;
  className?: string;
  'aria-label'?: string;
  role?: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

interface CommentData {
  id: string;
  content: string;
  authorId: string;
  author: User;
  mentions: Array<{ id: string; name: string; role: string; }>;
  parentId: string | null;
  isEdited: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
}

/**
 * TaskComments component for managing task comments with real-time updates
 * and offline support
 */
export const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  currentUser,
  className,
  'aria-label': ariaLabel = 'Task comments section',
  role = 'complementary',
}) => {
  // State management
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for managing optimistic updates and retries
  const optimisticUpdates = useRef(new Map<string, CommentData>());
  const retryTimeouts = useRef(new Map<string, number>());
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // WebSocket integration for real-time updates
  const { isConnected, subscribe, emit } = useWebSocket();

  // Scroll to latest comment
  const scrollToBottom = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle comment submission with offline support
  const handleCommentSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newComment.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create optimistic comment
      const optimisticComment: CommentData = {
        id: `temp-${Date.now()}`,
        content: newComment,
        authorId: currentUser.id,
        author: currentUser,
        mentions: extractMentions(newComment),
        parentId: replyToCommentId,
        isEdited: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      // Add to optimistic updates
      optimisticUpdates.current.set(optimisticComment.id, optimisticComment);
      setComments(prev => [...prev, optimisticComment]);

      // Emit comment via WebSocket
      if (isConnected) {
        await emit('comments', EventType.COMMENT_ADDED, {
          taskId,
          comment: optimisticComment,
        });
        
        // Update status on successful emission
        updateCommentStatus(optimisticComment.id, 'sent');
      } else {
        // Queue for retry if offline
        scheduleRetry(optimisticComment);
      }

      setNewComment('');
      setReplyToCommentId(null);
      scrollToBottom();
    } catch (err) {
      setError('Failed to submit comment. Please try again.');
      console.error('Comment submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isSubmitting, currentUser, replyToCommentId, isConnected, taskId, emit]);

  // Handle comment editing with version control
  const handleCommentEdit = useCallback(async (commentId: string, newContent: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const updatedComment = {
        ...comment,
        content: newContent,
        isEdited: true,
        version: comment.version + 1,
        updatedAt: new Date(),
      };

      // Optimistic update
      setComments(prev =>
        prev.map(c => c.id === commentId ? updatedComment : c)
      );

      if (isConnected) {
        await emit('comments', EventType.TASK_UPDATED, {
          taskId,
          commentId,
          content: newContent,
          version: comment.version,
        });
      } else {
        scheduleRetry(updatedComment);
      }

      setEditingCommentId(null);
    } catch (err) {
      setError('Failed to edit comment. Please try again.');
      console.error('Comment edit error:', err);
    }
  }, [comments, isConnected, taskId, emit]);

  // Extract @mentions from comment content
  const extractMentions = (content: string): Array<{ id: string; name: string; role: string; }> => {
    const mentions = content.match(MENTION_PATTERN) || [];
    return mentions.map(mention => {
      const name = mention.substring(1);
      // In a real implementation, you would look up the user details
      return { id: name, name, role: 'user' };
    });
  };

  // Schedule retry for failed operations
  const scheduleRetry = (comment: CommentData) => {
    const retryCount = comment.retryCount || 0;
    if (retryCount >= RETRY_INTERVALS.length) return;

    const timeoutId = window.setTimeout(() => {
      if (isConnected) {
        emit('comments', EventType.COMMENT_ADDED, {
          taskId,
          comment: { ...comment, retryCount: retryCount + 1 },
        });
      } else {
        scheduleRetry({ ...comment, retryCount: retryCount + 1 });
      }
    }, RETRY_INTERVALS[retryCount]);

    retryTimeouts.current.set(comment.id, timeoutId);
  };

  // Update comment status
  const updateCommentStatus = (commentId: string, status: 'pending' | 'sent' | 'failed') => {
    setComments(prev =>
      prev.map(c => c.id === commentId ? { ...c, status } : c)
    );
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe(`task-${taskId}-comments`, (data) => {
      if (data.type === EventType.COMMENT_ADDED) {
        setComments(prev => [...prev, data.comment]);
        scrollToBottom();
      }
    });

    return () => {
      unsubscribe();
      // Clear any pending retries
      retryTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [taskId, subscribe, scrollToBottom]);

  return (
    <CommentsContainer
      className={className}
      role={role}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          aria-label={`Comment by ${comment.author.name}`}
        >
          <Avatar
            src={comment.author.avatar}
            alt={comment.author.name}
            size="medium"
          />
          <CommentContent>
            <div className="comment-header">
              <span className="comment-author">{comment.author.name}</span>
              <span className="comment-timestamp">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
            </div>
            {editingCommentId === comment.id ? (
              <TextArea
                id={`edit-comment-${comment.id}`}
                value={comment.content}
                onChange={(value) => handleCommentEdit(comment.id, value)}
                maxLength={COMMENT_MAX_LENGTH}
                aria-label="Edit comment"
              />
            ) : (
              <p className="comment-text">{comment.content}</p>
            )}
            <div className="comment-actions">
              <Button
                variant="text"
                size="small"
                onClick={() => setReplyToCommentId(comment.id)}
                aria-label={`Reply to ${comment.author.name}'s comment`}
              >
                Reply
              </Button>
              {comment.authorId === currentUser.id && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setEditingCommentId(comment.id)}
                  aria-label="Edit comment"
                >
                  Edit
                </Button>
              )}
            </div>
          </CommentContent>
        </CommentItem>
      ))}
      
      <div ref={commentsEndRef} />

      <form onSubmit={handleCommentSubmit} aria-label="Add comment">
        <TextArea
          id="new-comment"
          value={newComment}
          onChange={setNewComment}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder={replyToCommentId ? 'Write a reply...' : 'Write a comment...'}
          aria-label={replyToCommentId ? 'Write a reply' : 'Write a comment'}
          required
        />
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={!newComment.trim()}
          aria-label="Submit comment"
        >
          {replyToCommentId ? 'Reply' : 'Comment'}
        </Button>
      </form>
    </CommentsContainer>
  );
};

export default TaskComments;