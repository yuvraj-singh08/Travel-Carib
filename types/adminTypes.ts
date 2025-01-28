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
