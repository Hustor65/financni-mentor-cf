import { lazy, Suspense } from 'react';
import { isPristine, useUserData } from '../../utils/store';
import { takeHomeUrl } from '../../utils/transfer';

const QrCode = lazy(() => import('./QrCode').then(m => ({ default: m.QrCode })));

/** Stánek: QR kód s adresou webu. Když už návštěvník něco nahrál, nese i jeho postup. */
export const TakeHome: React.FC = () => {
  const data = useUserData();
  const fresh = isPristine(data);
  return (
    <section className="hm-take hm-take--qr" aria-labelledby="hm-take">
      <Suspense fallback={<div className="hm-take__qr" aria-hidden="true" />}>
        <QrCode
          value={takeHomeUrl(data)}
          label={fresh ? 'QR kód s adresou tohoto webu' : 'QR kód s adresou webu a tvým postupem'}
        />
      </Suspense>
      <div className="hm-take__text">
        <h2 id="hm-take">{fresh ? 'Vezmi si to s sebou' : 'Vezmi si body s sebou'}</h2>
        <p>
          {fresh
            ? 'Namiř na kód foťák telefonu a pokračuj v klidu doma. Když si tam vytvoříš účet, postup ti zůstane.'
            : 'Namiř na kód foťák telefonu. Hotová témata a body z her se ti přenesou do telefonu a můžeš pokračovat doma.'}
        </p>
        <p className="hm-take__url">{window.location.host}</p>
      </div>
    </section>
  );
};
