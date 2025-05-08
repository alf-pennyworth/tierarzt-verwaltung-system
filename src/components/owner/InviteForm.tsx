
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Define the form schema
const inviteFormSchema = z.object({
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteFormProps {
  onSubmit: (values: InviteFormValues) => Promise<void>;
  loading: boolean;
  ownerName: string;
}

const InviteForm = ({ onSubmit, loading, ownerName }: InviteFormProps) => {
  // Create form with validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      message: `Sehr geehrte(r) ${ownerName},\n\nwir laden Sie ein, sich im Portal unserer Tierarztpraxis zu registrieren.\n\nMit freundlichen Grüßen,\nIhr Praxisteam`,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea 
                  rows={6} 
                  placeholder="Einladungsnachricht" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              "Einladung erstellen"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InviteForm;
