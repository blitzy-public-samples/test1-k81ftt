// react version: ^18.0.0
// @mui/material version: ^5.0.0
import React from 'react';
import { Box, Container, Typography, Link, Stack } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import Icon from '../common/Icon';

// Footer navigation links with enhanced accessibility
const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '/privacy', ariaLabel: 'View our privacy policy' },
  { label: 'Terms of Service', href: '/terms', ariaLabel: 'View our terms of service' },
  { label: 'Contact Us', href: '/contact', ariaLabel: 'Contact our support team' },
] as const;

// Social media links with accessibility labels
const SOCIAL_LINKS = [
  { icon: 'github', href: 'https://github.com', ariaLabel: 'Visit our GitHub page' },
  { icon: 'linkedin', href: 'https://linkedin.com', ariaLabel: 'Connect with us on LinkedIn' },
  { icon: 'twitter', href: 'https://twitter.com', ariaLabel: 'Follow us on Twitter' },
] as const;

// Enhanced interface for Footer props with accessibility options
interface FooterProps {
  className?: string;
  ariaLabel?: string;
  highContrast?: boolean;
}

// Styled footer component with enhanced accessibility and responsive design
const StyledFooter = styled(Box)(({ theme }) => ({
  width: '100%',
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(3, 0),
  marginTop: 'auto', // Ensures footer stays at bottom

  // Responsive padding adjustments
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4, 0),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(6, 0),
  },

  // High contrast mode support
  '&[data-high-contrast="true"]': {
    borderTop: `2px solid ${theme.palette.text.primary}`,
    backgroundColor: theme.palette.mode === 'dark' ? '#000' : '#fff',
  },

  // Focus visible styles for interactive elements
  '& a': {
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
      borderRadius: '4px',
    },
  },

  // RTL support
  [theme.direction === 'rtl' ? 'marginLeft' : 'marginRight']: 'auto',
}));

// Enhanced footer component with improved accessibility and responsive behavior
const Footer: React.FC<FooterProps> = ({
  className,
  ariaLabel = 'Site footer',
  highContrast = false,
}) => {
  const theme = useTheme();

  return (
    <StyledFooter
      component="footer"
      className={className}
      role="contentinfo"
      aria-label={ariaLabel}
      data-high-contrast={highContrast}
    >
      <Container
        maxWidth="lg"
        sx={{
          maxWidth: '1440px', // Maximum content width as per specs
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 }, // Responsive padding
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3, md: 4 }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'flex-start' }}
        >
          {/* Copyright section with semantic markup */}
          <Typography
            variant="body2"
            color="text.secondary"
            component="p"
            sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          >
            © {new Date().getFullYear()} Task Management System. All rights reserved.
          </Typography>

          {/* Navigation links with enhanced accessibility */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.5, sm: 3 }}
            alignItems="center"
          >
            {FOOTER_LINKS.map(({ label, href, ariaLabel }) => (
              <Link
                key={href}
                href={href}
                color="text.secondary"
                underline="hover"
                aria-label={ariaLabel}
                sx={{
                  typography: 'body2',
                  transition: theme.transitions.create('color'),
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                {label}
              </Link>
            ))}
          </Stack>

          {/* Social media links with accessible icons */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              order: { xs: -1, sm: 0 }, // Reorder on mobile
            }}
          >
            {SOCIAL_LINKS.map(({ icon, href, ariaLabel }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={ariaLabel}
              >
                <Icon
                  name={icon}
                  size="small"
                  color="text.secondary"
                  ariaLabel={ariaLabel}
                  highContrast={highContrast}
                  sx={{
                    transition: theme.transitions.create(['color', 'transform']),
                    '&:hover': {
                      color: 'text.primary',
                      transform: 'scale(1.1)',
                    },
                  }}
                />
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </StyledFooter>
  );
};

// Display name for debugging
Footer.displayName = 'Footer';

export default Footer;