import { Check, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  getUrl: () => string;
  label?: string;
}

/** Copies a share URL to the clipboard with transient "Copied!" feedback. */
export default function CopyLinkButton({ getUrl, label = 'Share' }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS): let the user copy manually.
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button type="button" className="btn btn-accent" onClick={copy}>
      {copied ? (
        <>
          <Check size={14} /> Copied!
        </>
      ) : (
        <>
          <Link2 size={14} /> {label}
        </>
      )}
    </button>
  );
}
