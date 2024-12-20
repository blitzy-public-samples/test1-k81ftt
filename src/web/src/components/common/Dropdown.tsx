// react version: ^18.0.0
// @mui/material version: ^5.0.0
// lodash version: ^4.17.21
// react-window version: ^1.8.8
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Chip, 
  TextField,
  SelectChangeEvent,
  Box,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import debounce from 'lodash/debounce';
import { VariableSizeList as VirtualList } from 'react-window';
import Icon from './Icon';

// Constants for component sizing and behavior
const DROPDOWN_SIZES = {
  small: 32,
  medium: 40,
  large: 48
} as const;

const MENU_ITEM_HEIGHT = {
  small: 32,
  medium: 40,
  large: 48
} as const;

const VIRTUAL_SCROLL_THRESHOLD = 100;
const SEARCH_DEBOUNCE_MS = 300;

// Styled components for enhanced visuals
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
    },
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiSelect-select': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    alignItems: 'center',
    minHeight: 'auto',
  },
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
  margin: theme.spacing(1),
  width: 'calc(100% - 16px)',
  '& .MuiInputBase-root': {
    padding: theme.spacing(0.5, 1),
  },
}));

// Interface definitions
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value: string | string[];
  options: DropdownOption[];
  label: string;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  searchable?: boolean;
  virtualScroll?: boolean;
  maxHeight?: number;
  customStyles?: Record<string, any>;
  onChange: (value: string | string[]) => void;
  onSearch?: (searchTerm: string) => void;
  onBlur?: () => void;
  className?: string;
  size?: keyof typeof DROPDOWN_SIZES;
  fullWidth?: boolean;
}

// Virtual scroll row renderer
const VirtualRow = React.memo(({ data, index, style }: any) => {
  const option = data[index];
  return (
    <MenuItem
      style={style}
      value={option.value}
      disabled={option.disabled}
      key={option.value}
    >
      {option.label}
    </MenuItem>
  );
});

VirtualRow.displayName = 'VirtualRow';

// Main Dropdown component
const Dropdown = React.memo<DropdownProps>(({
  value,
  options,
  label,
  placeholder,
  multiple = false,
  disabled = false,
  error = false,
  helperText,
  required = false,
  searchable = false,
  virtualScroll = false,
  maxHeight = 300,
  customStyles = {},
  onChange,
  onSearch,
  onBlur,
  className,
  size = 'medium',
  fullWidth = false,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [open, setOpen] = useState(false);
  const listRef = useRef<VirtualList>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchValue) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [options, searchValue]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      onSearch?.(term);
    }, SEARCH_DEBOUNCE_MS),
    [onSearch]
  );

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchValue(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  // Handle dropdown value change
  const handleChange = useCallback((event: SelectChangeEvent<string | string[]>) => {
    const newValue = event.target.value;
    onChange(newValue);
  }, [onChange]);

  // Handle dropdown open/close
  const handleOpen = useCallback(() => {
    setOpen(true);
    setSearchValue('');
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    onBlur?.();
  }, [onBlur]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, searchable]);

  // Render selected value(s)
  const renderValue = useCallback((selected: string | string[]) => {
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      return <Typography color="textSecondary">{placeholder}</Typography>;
    }

    if (multiple) {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {(selected as string[]).map((value) => {
            const option = options.find(opt => opt.value === value);
            return (
              <Chip
                key={value}
                label={option?.label}
                size={size === 'small' ? 'small' : 'medium'}
                onDelete={disabled ? undefined : () => {
                  onChange((selected as string[]).filter(v => v !== value));
                }}
                deleteIcon={<Icon name="close" size="small" />}
              />
            );
          })}
        </Box>
      );
    }

    return options.find(opt => opt.value === selected)?.label;
  }, [multiple, options, onChange, disabled, size, placeholder]);

  // Virtual scroll configuration
  const itemSize = MENU_ITEM_HEIGHT[size];
  const shouldVirtualize = virtualScroll && filteredOptions.length > VIRTUAL_SCROLL_THRESHOLD;

  return (
    <StyledFormControl
      error={error}
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      className={className}
      sx={customStyles}
    >
      <InputLabel id={`${label}-label`}>{label}</InputLabel>
      <StyledSelect
        labelId={`${label}-label`}
        id={`${label}-select`}
        value={value}
        multiple={multiple}
        onChange={handleChange}
        onOpen={handleOpen}
        onClose={handleClose}
        renderValue={renderValue}
        open={open}
        size={size}
        MenuProps={{
          PaperProps: {
            style: { maxHeight },
          },
          MenuListProps: {
            style: { padding: 0 },
          },
        }}
      >
        {searchable && (
          <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <SearchTextField
              inputRef={searchInputRef}
              placeholder="Search..."
              value={searchValue}
              onChange={handleSearchChange}
              size="small"
              fullWidth
              autoComplete="off"
            />
          </Box>
        )}
        
        {shouldVirtualize ? (
          <VirtualList
            ref={listRef}
            height={maxHeight - (searchable ? 60 : 0)}
            width="100%"
            itemCount={filteredOptions.length}
            itemSize={() => itemSize}
            itemData={filteredOptions}
          >
            {VirtualRow}
          </VirtualList>
        ) : (
          filteredOptions.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              sx={{ height: itemSize }}
            >
              {option.label}
            </MenuItem>
          ))
        )}
      </StyledSelect>
      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error' : 'textSecondary'}
          sx={{ mt: 0.5 }}
        >
          {helperText}
        </Typography>
      )}
    </StyledFormControl>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
export type { DropdownProps, DropdownOption };