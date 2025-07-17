export interface AdminPermissions {
  name: string;
  active: boolean;
  permissions: {
    View: roletypes;
    Create: roletypes;
    Update: roletypes;
    Delete: roletypes;
  };
}

export interface roletypes {
  view: boolean;
  update: boolean;
}

export interface ScrapingModuleInput {
  airlineName: string;
  packageName: string;
  cabinBaggage?: string;
  checkedBaggage?: string;
  handBaggage?: string;
  otherDetails?: string[];
  price: number;
}

export interface ScrapingModuleUpdateInput {
  id: string;
  airlineName?: string;
  packageName?: string;
  cabinBaggage?: string;
  checkedBaggage?: string;
  handBaggage?: string;
  otherDetails?: string[];
  price?: number;
}
