import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UserCog } from 'lucide-react';
import { getTokenPayload, switchProfile, getApiErrorMessage } from '@/lib/http';

/**
 * Lets the signed-in user switch their active profile/branch (e.g. Doctor →
 * Business Admin) without re-logging-in. Reads the profiles embedded in the JWT
 * and calls kalnostics `switch-profile`, then reloads so every query re-fetches
 * under the new context. Hidden when the user has only one profile.
 */
export function ProfileSwitcher() {
  const payload = getTokenPayload();
  const [busy, setBusy] = useState(false);

  const profiles = useMemo(() => payload?.profiles ?? [], [payload]);

  // A stable value per profile (profileKey + branchId) for the <select>.
  const valueOf = (profileKey: string, branchId: string | null) =>
    `${profileKey}::${branchId ?? ''}`;

  const current = payload
    ? valueOf(payload.active_profile_key ?? '', payload.active_branch_id ?? null)
    : '';

  if (profiles.length <= 1) return null;

  const onChange = async (value: string) => {
    const [profileKey, branchId] = value.split('::');
    if (!profileKey) return;
    setBusy(true);
    try {
      await switchProfile(profileKey, branchId || null);
      toast.success('Profile switched.');
      // Reload so permissions + all data re-fetch under the new profile.
      window.location.reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not switch profile'));
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5" title="Switch profile / branch">
      <UserCog className="h-4 w-4 text-muted-foreground" />
      <select
        aria-label="Active profile"
        disabled={busy}
        className="h-9 max-w-[220px] rounded-lg border border-input bg-background px-2 text-sm shadow-xs"
        value={current}
        onChange={(e) => void onChange(e.target.value)}
      >
        {profiles.map((p) => (
          <option
            key={valueOf(p.profile_key, p.branch_id)}
            value={valueOf(p.profile_key, p.branch_id)}
          >
            {p.profile_label}
            {p.branch_name ? ` — ${p.branch_name}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
