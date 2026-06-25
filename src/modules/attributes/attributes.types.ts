import { AttributeType } from '@prisma/client';
import { LocalizedString } from '@shared/types';

export interface CreateAttributeDefinitionInput {
  categoryId: string;
  key: string;
  label: LocalizedString;
  type: AttributeType;
  unit?: string;
  options?: string[];
  isFilterable?: boolean;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateAttributeDefinitionInput {
  label?: LocalizedString;
  unit?: string;
  options?: string[];
  isFilterable?: boolean;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface SetProductAttributesInput {
  // key → value pairs  e.g. { ram: "8GB", color: "Black" }
  attributes: Record<string, string>;
}

export interface AttributeFacet {
  key: string;
  label: LocalizedString;
  type: AttributeType;
  unit: string | null;
  options: string[];          // all possible values
  counts: Record<string, number>; // value → product count
}
