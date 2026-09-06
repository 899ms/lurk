import { BrandImage } from "./BrandImage";
import { MockFrame } from "./MockFrame";
import { MOCK_USAGE_ROWS } from "./mockContent";

export function AppMockUsage() {
  return (
    <MockFrame active="Data usage" title="Data usage">
      <div className="mock-content mock-usage">
        <div className="mock-section-title">
          <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={28} />
          <span>
            The price of a request<small>Measured per-call examples</small>
          </span>
        </div>
        <div className="mock-price">
          <span>$0.0012</span>
          <small>via reddit.search</small>
        </div>
        <div className="mock-ledger">
          <div className="mock-ledger-head">
            <span>API / purpose</span>
            <span>USD per call</span>
          </div>
          {MOCK_USAGE_ROWS.map((row) => (
            <div key={row.api}>
              <span>
                {row.api}
                <small>{row.purpose}</small>
              </span>
              <span>{row.cost}</span>
            </div>
          ))}
        </div>
        <p className="mock-muted">
          Calls served from data already fetched are shown separately and cost nothing.
        </p>
      </div>
    </MockFrame>
  );
}
