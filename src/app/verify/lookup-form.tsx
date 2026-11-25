import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** A plain GET form: `/verify?code=…` redirects to the certificate's own page. */
export function LookupForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/verify" method="get" className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="code" className="sr-only">
        Certificate number
      </label>
      <Input
        id="code"
        name="code"
        defaultValue={defaultValue}
        placeholder="411-1A2B3C4D5E"
        autoComplete="off"
        spellCheck={false}
        required
        className="font-mono uppercase"
      />
      <button type="submit" className={buttonVariants({ className: 'shrink-0' })}>
        Verify
      </button>
    </form>
  );
}
