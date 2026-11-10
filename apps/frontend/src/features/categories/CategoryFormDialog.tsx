import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { useCreateCategory, useUpdateCategory } from './api';
import type { Category } from './types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this category; otherwise it creates one. */
  category?: Category | null;
}

/** Create/edit dialog for an inventory category. */
export function CategoryFormDialog({ open, onOpenChange, category }: Props) {
  const isEdit = !!category;
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: category?.name ?? '',
      code: category?.code ?? '',
      description: category?.description ?? '',
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && category) {
        await update.mutateAsync({ id: category.id, input: values });
        toast.success('Category updated');
      } else {
        await create.mutateAsync(values);
        toast.success('Category created');
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save category'));
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register('code')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input id="sortOrder" type="number" {...register('sortOrder')} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
