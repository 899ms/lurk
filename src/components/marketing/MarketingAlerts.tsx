"use client";
import { motion, useReducedMotion } from "motion/react";
import { Mail, Webhook } from "lucide-react";
import { BrandImage } from "./BrandImage";
import { ALERT_THREAD } from "./mockContent";
import { ThreadIdentity } from "./ThreadIdentity";

export function MarketingAlerts() {
  const reduced = useReducedMotion();
  return (
    <section className="alerts-story" id="alerts" data-proof="alerts">
      <header className="narrow-heading">
        <h2>
          <span>Keep your place.</span> Let the digest come to you.
        </h2>
        <p>
          New-lead digests go to email, Slack, Discord or your webhook with the
          score, reason and original link. Daily on the hosted free tier; hourly
          with a connected wallet.
        </p>
      </header>
      <div className="alerts-demo demo-stage" data-motion="alerts">
        <div className="delivery-channels">
          <span>
            <BrandImage name="Slack" src="/brands/slack.svg" size={24} />
            Slack
          </span>
          <span>
            <BrandImage name="Discord" src="/brands/discord.svg" size={24} />
            Discord
          </span>
          <span>
            <Mail />
            Email
          </span>
          <span>
            <Webhook />
            Webhook
          </span>
        </div>
        <div className="slack-stage">
          <div className="slack-channel">
            # reddit-research <span>Delivery layout preview</span>
          </div>
          <motion.div
            className="delivery-bubble"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: "easeOut" }}
          >
            <div className="fragment-title">
              <BrandImage name="Slack" src="/brands/slack.svg" />
              lurk<span>Example message</span>
            </div>
            <ThreadIdentity thread={ALERT_THREAD} />
            <a
              href={ALERT_THREAD.url}
              className="fragment-subject"
              target="_blank"
              rel="noreferrer"
            >
              {ALERT_THREAD.title}
            </a>
            <p>
              A saved monitoring question from r/selfhosted. Open the
              conversation to read the context.
            </p>
            <small>
              Unscored saved thread shown to illustrate delivery. No alert was
              sent.
            </small>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
