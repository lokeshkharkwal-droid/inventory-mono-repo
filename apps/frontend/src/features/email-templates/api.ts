import { makeCrudHooks } from '@/features/_shared/crud';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string | null;
  type: string | null;
  isActive: boolean;
}

/** Email/message template CRUD hooks (backend routes under /email-templates). */
export const emailTemplateHooks = makeCrudHooks<
  EmailTemplate,
  Record<string, unknown>
>('email-templates', 'email-templates');
