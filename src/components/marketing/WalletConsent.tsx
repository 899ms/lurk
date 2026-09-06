import Link from "next/link";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { BrandImage } from "./BrandImage";

export function WalletConsent() {
  return (
    <div className="wallet-story" data-proof="wallet">
      <div>
        <span className="eyebrow-link">Your wallet, your cap</span>
        <h3>
          Give lurk a budget.
          <br />
          Keep control of the key.
        </h3>
        <p>
          Connect through AnyAPI, choose the spend cap there, then return to
          lurk. Disconnecting revokes the connection.
        </p>
        <Link className="fragment-link" href="/sign-up">
          Start with the hosted app <ArrowRight size={14} />
        </Link>
      </div>
      <div className="consent-preview">
        <div className="consent-brands">
          <span>lurk</span>
          <ArrowRight />
          <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={30} />
          <span>AnyAPI</span>
        </div>
        <h3>lurk is requesting access</h3>
        <ul>
          <li>
            <Check size={16} />
            Run data requests <code>run</code>
          </li>
          <li>
            <Check size={16} />
            Read wallet balance <code>balance:read</code>
          </li>
        </ul>
        <div className="consent-cap">
          <LockKeyhole size={16} />
          <span>
            Spend cap<small>You choose it on AnyAPI</small>
          </span>
        </div>
        <p className="demo-note">
          Consent flow illustration. Scopes come from the connect route; cap
          controls are hosted by AnyAPI. No amount or period is preselected
          here.
        </p>
      </div>
    </div>
  );
}
