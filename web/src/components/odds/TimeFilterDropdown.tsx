'use client';

import { TIME_FILTER_OPTIONS, type TimeFilter } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeFilterDropdownProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
}

export function TimeFilterDropdown({ value, onChange }: TimeFilterDropdownProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeFilter)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {TIME_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
