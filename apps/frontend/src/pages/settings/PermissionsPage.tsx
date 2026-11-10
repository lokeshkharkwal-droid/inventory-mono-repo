import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  usePermissionCatalog,
  usePermissions,
  permKey,
} from '@/features/permissions/api';

/** Read-only view of the permission catalogue with the caller's granted/denied. */
export function PermissionsPage() {
  const { data: catalog } = usePermissionCatalog();
  const { profileKey, can } = usePermissions();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Your effective permissions for profile{' '}
          <span className="font-medium text-foreground">{profileKey ?? '—'}</span>.
          Controls you can't use are disabled across the app.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(catalog ?? []).map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {section.actions.map((a) => {
                const allowed = can(permKey(section.key, a.action));
                return (
                  <div
                    key={a.action}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{a.label}</span>
                    {allowed ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" /> Allowed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <X className="h-4 w-4" /> No access
                      </span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
