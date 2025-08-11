import { isGeneratorObject } from "util/types";
import { prisma } from "../prismaClient"

[
  {
    "name": "Dashboard",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": true,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Firewall",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Customer Details",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Commission Details",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "User Management",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Ticket System",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Landing Page",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Settings",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  },
  {
    "name": "Search Management",
    "active": true,
    "permissions": {
      "View": {
        "view": true,
        "update": false
      },
      "Create": {
        "view": false,
        "update": false
      },
      "Delete": {
        "view": true,
        "update": false
      },
      "Update": {
        "view": false,
        "update": false
      },
      "View All Records": {
        "view": false,
        "update": false
      }
    }
  }
]


export const checkPermission = async(roleId:string,resource:string,action:string) => {
    const roleData = await prisma.role.findUnique({
        where: { id: roleId }
        
    })

    const permissionGroups :any =  roleData?.permissionGroups || [];

    
    
    const resourcePermissions = permissionGroups.find((group:any )=> group.name === resource)?.permissions;
    
    console.log("resourcePermissions",resourcePermissions);
    
    // if(!resourcePermissions.active) return false;

    console.log("resourcePermissions after");

    if (!resourcePermissions) {
        return false; // Resource not found
    }
    // Check if the action exists in the resource permissions
    const actionPermission = resourcePermissions[action];
    console.log("actionPermission",actionPermission);
    if (actionPermission) {
        return actionPermission.view ;
    }   

    return false;

}