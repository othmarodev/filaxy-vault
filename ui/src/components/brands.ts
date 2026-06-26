import {
  siGithub, siNetflix, siX, siInstagram, siTiktok, siFacebook, siReddit, siSnapchat,
  siPinterest, siThreads, siMastodon, siDiscord, siWhatsapp, siTelegram, siYoutube,
  siSpotify, siTwitch, siCrunchyroll, siHbomax, siParamountplus, siAppletv, siApple,
  siApplemusic, siGoogle, siGmail, siPaypal, siSteam, siDropbox, siProtonmail, siBinance,
  siCoinbase, siPlaystation, siGitlab, siNotion, siZoom, siFigma, siStackoverflow,
} from "simple-icons";

import { EXTRA_BRANDS } from "./brands_extra";

export type Brand = { name: string; inner: string };

type SimpleIcon = { title: string; hex: string; path: string };
const si = (icon: SimpleIcon): Brand => ({ name: icon.title, inner: `<path fill="#${icon.hex}" d="${icon.path}"/>` });

// Hand-authored for major brands removed from the open (CC0) Simple Icons set.
const MICROSOFT: Brand = {
  name: "Microsoft",
  inner: `<rect x="0" y="0" width="11" height="11" fill="#F25022"/><rect x="13" y="0" width="11" height="11" fill="#7FBA00"/><rect x="0" y="13" width="11" height="11" fill="#00A4EF"/><rect x="13" y="13" width="11" height="11" fill="#FFB900"/>`,
};
const LINKEDIN: Brand = {
  name: "LinkedIn",
  inner: `<path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>`,
};

export const BRANDS: Brand[] = [
  MICROSOFT, LINKEDIN,
  si(siGithub), si(siGoogle), si(siGmail), si(siApple), si(siX), si(siInstagram),
  si(siFacebook), si(siTiktok), si(siWhatsapp), si(siTelegram), si(siDiscord),
  si(siReddit), si(siSnapchat), si(siPinterest), si(siThreads), si(siMastodon),
  si(siNetflix), si(siYoutube), si(siSpotify), si(siTwitch), si(siCrunchyroll),
  si(siHbomax), si(siParamountplus), si(siAppletv), si(siApplemusic),
  si(siPaypal), si(siBinance), si(siCoinbase), si(siSteam), si(siPlaystation),
  si(siDropbox), si(siProtonmail), si(siGitlab), si(siNotion), si(siZoom),
  si(siFigma), si(siStackoverflow),
  ...EXTRA_BRANDS,
];

/** Wrap brand inner markup in a white rounded tile (so dark logos stay visible). */
export function brandDataUrl(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#ffffff"/><g transform="translate(4 4) scale(0.6667)">${inner}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
