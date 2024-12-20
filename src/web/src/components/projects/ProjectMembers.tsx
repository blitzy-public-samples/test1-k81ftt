// @mui/material version ^5.0.0
// react version ^18.0.0
import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Stack, IconButton, CircularProgress, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Avatar from '../common/Avatar';
import Tooltip from '../common/Tooltip';

// Constants
const MAX_VISIBLE_MEMBERS = 5;
const REAL_TIME_UPDATE_CHANNEL = 'project-members';

// Enums
export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

// Interfaces
export interface ProjectMember {
  id: string;
  name: string;
  role: ProjectRole;
  avatarUrl: string;
  email: string;
  lastActive: Date;
  permissions: string[];
}

export interface ProjectMembersProps {
  projectId: string;
  members: ProjectMember[];
  onAddMember: (projectId: string) => Promise<void>;
  onRemoveMember: (projectId: string, memberId: string) => Promise<void>;
  onMemberClick: (member: ProjectMember) => void;
  isEditable: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Styled Components
const MembersContainer = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const MemberStack = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  minHeight: 40,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
  },
  width: 32,
  height: 32,
}));

/**
 * ProjectMembers Component
 * Displays and manages project team members with role-based access control
 * and real-time updates following Material Design 3 principles.
 */
export const ProjectMembers: React.FC<ProjectMembersProps> = ({
  projectId,
  members,
  onAddMember,
  onRemoveMember,
  onMemberClick,
  isEditable,
  isLoading,
  error
}) => {
  const [localMembers, setLocalMembers] = useState<ProjectMember[]>(members);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  // Update local members when props change
  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  // Handle real-time updates
  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || '');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === REAL_TIME_UPDATE_CHANNEL && data.projectId === projectId) {
        setLocalMembers(data.members);
      }
    };

    return () => {
      ws.close();
    };
  }, [projectId]);

  // Handle member addition with optimistic updates
  const handleAddMember = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      await onAddMember(projectId);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  }, [projectId, onAddMember]);

  // Handle member removal with confirmation
  const handleRemoveMember = useCallback(async (memberId: string) => {
    const member = localMembers.find(m => m.id === memberId);
    if (member?.role === ProjectRole.OWNER) {
      return; // Prevent owner removal
    }

    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setLoadingMemberId(memberId);
    try {
      await onRemoveMember(projectId, memberId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setLoadingMemberId(null);
    }
  }, [projectId, localMembers, onRemoveMember]);

  // Render member tooltip content
  const renderMemberTooltip = (member: ProjectMember) => (
    <div>
      <div>{member.name}</div>
      <div>{member.email}</div>
      <div>Role: {member.role}</div>
      <div>Last active: {new Date(member.lastActive).toLocaleDateString()}</div>
    </div>
  );

  return (
    <MembersContainer
      role="group"
      aria-label="Project members"
      aria-busy={isLoading}
    >
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => {/* Handle error dismissal */}}
        >
          {error.message}
        </Alert>
      )}

      <MemberStack>
        {localMembers.slice(0, MAX_VISIBLE_MEMBERS).map((member) => (
          <Tooltip
            key={member.id}
            content={renderMemberTooltip(member)}
            position="top"
            showOnFocus
          >
            <div>
              <Avatar
                src={member.avatarUrl}
                name={member.name}
                role={member.role}
                size="medium"
                onClick={() => onMemberClick(member)}
              />
              {isEditable && member.role !== ProjectRole.OWNER && (
                <ActionButton
                  size="small"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={loadingMemberId === member.id}
                  aria-label={`Remove ${member.name}`}
                >
                  {loadingMemberId === member.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <RemoveIcon fontSize="small" />
                  )}
                </ActionButton>
              )}
            </div>
          </Tooltip>
        ))}

        {localMembers.length > MAX_VISIBLE_MEMBERS && (
          <Tooltip
            content={`${localMembers.length - MAX_VISIBLE_MEMBERS} more members`}
            position="top"
          >
            <Avatar
              name={`+${localMembers.length - MAX_VISIBLE_MEMBERS}`}
              size="medium"
              onClick={() => {/* Handle showing all members */}}
            />
          </Tooltip>
        )}

        {isEditable && (
          <ActionButton
            onClick={handleAddMember}
            disabled={isLoading}
            aria-label="Add member"
          >
            {isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AddIcon fontSize="small" />
            )}
          </ActionButton>
        )}
      </MemberStack>
    </MembersContainer>
  );
};

export default ProjectMembers;