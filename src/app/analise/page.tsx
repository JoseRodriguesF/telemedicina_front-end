'use client';

import { useRouter } from 'next/navigation';
import PendingReviewModal from '@/components/common/Modals/PendingReviewModal/PendingReviewModal';
import { getUser } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function AnalisePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const u = getUser();
      if (u?.email) setEmail(String(u.email));
    } catch {}
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <PendingReviewModal
        open={open}
        email={email}
        onClose={() => setOpen(false)}
        onGoHome={() => router.push('/')}
      />
      {!open && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Cadastro em análise</h2>
          <p style={{ color: '#4b5563' }}>Você pode fechar esta página. Retorne mais tarde.</p>
        </div>
      )}
    </div>
  );
}
