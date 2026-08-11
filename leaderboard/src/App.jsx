import { useEffect, useMemo, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  ArrowRight,
  Copy,
  CaretDown,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  FunnelSimple,
  Hash,
  MagnifyingGlass,
  Sparkle,
  Trophy,
  UsersThree,
  XLogo,
} from "@phosphor-icons/react";

const PAGE_SIZE = 12;
const EXCLUDED_USERNAMES = new Set(["mee6#4876"]);
const numberFormatter = new Intl.NumberFormat("en-US");

function getChannelScore(user, channelIndex) {
  for (let index = 0; index < user.channels.length; index += 2) {
    if (user.channels[index] === channelIndex) return user.channels[index + 1];
  }
  return 0;
}

function getFavoriteChannel(user, channels) {
  let favoriteIndex = -1;
  let favoriteScore = -1;
  for (let index = 0; index < user.channels.length; index += 2) {
    if (user.channels[index + 1] > favoriteScore) {
      favoriteIndex = user.channels[index];
      favoriteScore = user.channels[index + 1];
    }
  }
  return channels[favoriteIndex]?.name || "No activity";
}

function getTopChannels(user, channels, limit = 3) {
  const activity = [];
  for (let index = 0; index < user.channels.length; index += 2) {
    activity.push({
      name: channels[user.channels[index]]?.name || "Unknown channel",
      messages: user.channels[index + 1],
    });
  }
  return activity.sort((a, b) => b.messages - a.messages).slice(0, limit);
}

function getRarity(rank) {
  if (rank <= 100) return "Legendary";
  if (rank <= 1000) return "Epic";
  if (rank <= 10000) return "Rare";
  return "Common";
}

function cleanChannelName(name) {
  return name?.includes("?") ? name.split("?").at(-1) : name;
}

function mapUser(raw) {
  return {
    id: raw[0],
    name: raw[1],
    avatar: raw[2],
    total: raw[3],
    channels: raw[5],
  };
}

function Avatar({ user, size = "regular" }) {
  return (
    <span className={`avatar avatar-${size}`}>
      <img
        src={user.avatar || "/assets/optimum-mark-white.png"}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = "/assets/optimum-mark-white.png";
        }}
      />
      <span className="presence" aria-label="Active member" />
    </span>
  );
}

export function App() {
  const [activeView, setActiveView] = useState("leaderboard");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [channelIndex, setChannelIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [cardQuery, setCardQuery] = useState("");
  const [generatedCard, setGeneratedCard] = useState(null);
  const [cardError, setCardError] = useState("");
  const [cardActionStatus, setCardActionStatus] = useState("");
  const [cardActionBusy, setCardActionBusy] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/leaderboard-data.json")
      .then((response) => {
        if (!response.ok) throw new Error("Leaderboard data could not be loaded.");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setData({
          ...payload,
          users: payload.users
            .map(mapUser)
            .filter((user) => !EXCLUDED_USERNAMES.has(user.name.toLocaleLowerCase("en-US"))),
        });
      })
      .catch((reason) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankedUsers = useMemo(() => {
    if (!data) return [];
    const scored = data.users.map((user) => ({
      ...user,
      score: channelIndex === -1 ? user.total : getChannelScore(user, channelIndex),
      favoriteChannel: getFavoriteChannel(user, data.channels),
    }));
    scored.sort((a, b) => b.score - a.score || b.total - a.total || a.name.localeCompare(b.name));
    return scored.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [data, channelIndex]);

  const allChannelUsers = useMemo(() => {
    if (!data) return [];
    return [...data.users]
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        rarity: getRarity(index + 1),
        topChannels: getTopChannels(user, data.channels),
      }));
  }, [data]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-US");
    if (!query) return rankedUsers;
    return rankedUsers.filter(
      (user) => user.name.toLocaleLowerCase("en-US").includes(query) || user.id.includes(query),
    );
  }, [rankedUsers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedChannel = channelIndex === -1 ? null : data?.channels[channelIndex];
  const boardLabel = selectedChannel
    ? `${cleanChannelName(selectedChannel.name)} messages`
    : "All channels messages";

  useEffect(() => {
    setPage(1);
  }, [channelIndex, search]);

  function generateCard(event) {
    event.preventDefault();
    const query = cardQuery.trim().toLocaleLowerCase("en-US");
    if (!query) {
      setGeneratedCard(null);
      setCardError("Enter a Discord username to generate a card.");
      return;
    }

    const exactMatch = allChannelUsers.find((user) => user.name.toLocaleLowerCase("en-US") === query);
    const partialMatch = allChannelUsers.find((user) => user.name.toLocaleLowerCase("en-US").includes(query));
    const match = exactMatch || partialMatch;
    if (!match) {
      setGeneratedCard(null);
      setCardError("No member found. Check the username and try again.");
      return;
    }

    setGeneratedCard(match);
    setCardQuery(match.name);
    setCardError("");
  }

  async function downloadCardPng() {
    if (!cardRef.current || !generatedCard) return;
    setCardActionBusy(true);
    setCardActionStatus("");
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#10141c",
      });
      const link = document.createElement("a");
      const safeName = generatedCard.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
      link.download = `optimum-${safeName || "member"}-rank-${generatedCard.rank}.png`;
      link.href = dataUrl;
      link.click();
      setCardActionStatus("PNG downloaded.");
    } catch {
      setCardActionStatus("PNG could not be downloaded. Please try again.");
    } finally {
      setCardActionBusy(false);
    }
  }

  async function copyCardPng() {
    if (!cardRef.current || !generatedCard) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      setCardActionStatus("PNG copying is not supported in this browser.");
      return;
    }
    setCardActionBusy(true);
    setCardActionStatus("");
    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#10141c",
      });
      if (!blob) throw new Error("Card image could not be created.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCardActionStatus("PNG copied to clipboard.");
    } catch {
      setCardActionStatus("PNG could not be copied. Check browser permissions.");
    } finally {
      setCardActionBusy(false);
    }
  }

  function shareCardOnX() {
    const post = [
      "Check your Discord ranking",
      "",
      "https://optimum-leaderboard.vercel.app",
      "",
      "Thanks for the work @makssay_eth",
      "",
      "@kentlinyy @blockchainjeff",
    ].join("\n");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(post)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <div className="app-shell">
      <img className="blob blob-top" src="/assets/metablob-1.png" alt="" aria-hidden="true" />
      <img className="blob blob-bottom" src="/assets/metablob-2.png" alt="" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#leaderboard" aria-label="Optimum home">
          <img src="/assets/optimum-logo-white.svg" alt="Optimum" />
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={activeView === "leaderboard" ? "is-current" : ""} type="button" onClick={() => setActiveView("leaderboard")}>Discord Leaderboard</button>
          <button className={activeView === "generator" ? "is-current" : ""} type="button" onClick={() => setActiveView("generator")}>Card Generator</button>
          <button className={activeView === "twitter" ? "is-current" : ""} type="button" onClick={() => setActiveView("twitter")}>Twitter Leaderboard</button>
        </nav>
      </header>

      <main className={`content${activeView !== "leaderboard" ? " generator-mode" : ""}`} id="leaderboard">
        <section className="hero" aria-labelledby="page-title" hidden={activeView !== "leaderboard"}>
          <div>
            <p className="eyebrow"><UsersThree size={18} aria-hidden="true" /> Community standings</p>
            <h1 id="page-title">Discord Leaderboard</h1>
            <p className="hero-copy">Explore the members shaping the Optimum community.</p>
          </div>
          <div className="mascot-lockup" aria-hidden="true">
            <img src="/assets/optimum-mascot-reference.png" alt="" />
          </div>
        </section>

        <section className="leaderboard-panel" aria-label={`${boardLabel} leaderboard`} hidden={activeView !== "leaderboard"}>
          <div className="table-tools">
            <label className="channel-control">
              <span className="filter-icon"><FunnelSimple size={21} weight="regular" aria-hidden="true" /></span>
              <span className="filter-copy">
                <span className="filter-label">Channel filter</span>
                <span className="select-wrap">
                  <Hash size={18} aria-hidden="true" />
                  <select
                    value={channelIndex}
                    onChange={(event) => setChannelIndex(Number(event.target.value))}
                    aria-label="Filter leaderboard by Discord channel"
                  >
                    <option value={-1}>All channels</option>
                    {data?.channels.map((channel) => (
                      <option value={channel.index} key={channel.name}>{cleanChannelName(channel.name)}</option>
                    ))}
                  </select>
                  <CaretDown size={16} aria-hidden="true" />
                </span>
              </span>
            </label>

            <div className="board-context" aria-live="polite">
              <span>Ranking by</span>
              <strong>{boardLabel}</strong>
            </div>

            <label className="search-control">
              <MagnifyingGlass size={20} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members"
                aria-label="Search members by name or Discord ID"
              />
              {search && <span className="result-count">{numberFormatter.format(filteredUsers.length)}</span>}
            </label>
          </div>

          {error ? (
            <div className="state-message" role="alert">{error}</div>
          ) : !data ? (
            <div className="state-message" aria-live="polite">
              <span className="loader" /> Loading community rankings…
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <div className="leaderboard-table" role="table" aria-label={boardLabel}>
                  <div className="table-header table-grid" role="row">
                    <span role="columnheader">Rank</span>
                    <span role="columnheader">Member</span>
                    <span className="messages-heading" role="columnheader">Messages</span>
                    <span role="columnheader">Favorite channel</span>
                  </div>

                  {visibleUsers.map((user) => {
                    const isSelected = selectedId === user.id || (!selectedId && user.rank === 1);
                    return (
                      <button
                        className={`member-row table-grid${user.rank <= 3 ? " is-top" : ""}${isSelected ? " is-selected" : ""}`}
                        role="row"
                        type="button"
                        key={user.id}
                        onClick={() => setSelectedId(user.id)}
                        aria-selected={isSelected}
                      >
                        <span className={`rank rank-${Math.min(user.rank, 4)}`} role="cell">{user.rank}</span>
                        <span className="member-cell" role="cell">
                          <Avatar user={user} size={user.rank <= 3 ? "top" : "regular"} />
                          <span className="member-name-wrap"><strong>{user.name}</strong></span>
                        </span>
                        <strong className="score messages-cell" role="cell">{numberFormatter.format(user.score)}</strong>
                        <span className="favorite-channel" role="cell">
                          <Hash size={16} weight="bold" aria-hidden="true" />
                          <span>{cleanChannelName(user.favoriteChannel)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <footer className="table-footer">
                <p>
                  Showing {filteredUsers.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)} of {numberFormatter.format(filteredUsers.length)} members
                </p>
                <div className="pagination" aria-label="Leaderboard pages">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} aria-label="Previous page"><CaretLeft size={17} /></button>
                  <span>Page <strong>{safePage}</strong> of {numberFormatter.format(totalPages)}</span>
                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage === totalPages} aria-label="Next page"><CaretRight size={17} /></button>
                </div>
              </footer>
            </>
          )}
        </section>

        <section className={`card-generator generator-view${generatedCard ? " has-result" : ""}`} id="card-generator" aria-labelledby="card-generator-title" hidden={activeView !== "generator"}>
          <img className="generator-symbol symbol-1" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-2" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-3" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-4" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <div className="generator-copy">
            <p className="eyebrow"><Sparkle size={18} aria-hidden="true" /> Community collectible</p>
            <h2 id="card-generator-title"><span>Optimum</span> Community Card</h2>
            <p>Turn your Discord activity into a collectible card made for the Optimum community.</p>

            <form className="generator-form" onSubmit={generateCard}>
              <label htmlFor="discord-username">Discord username</label>
              <div className="generator-input-row">
                <div className="generator-input">
                  <MagnifyingGlass size={20} aria-hidden="true" />
                  <input
                    id="discord-username"
                    value={cardQuery}
                    onChange={(event) => setCardQuery(event.target.value)}
                    placeholder="e.g. voltage_117"
                    autoComplete="off"
                  />
                </div>
                <button type="submit" disabled={!data}>
                  Generate card <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
              {cardError && <p className="generator-error" role="alert">{cardError}</p>}
              <p className="rarity-note">Rarity is based on all-time rank: Legendary 1–100 · Epic 101–1,000 · Rare 1,001–10,000 · Common 10,001+</p>
            </form>
          </div>

          <div ref={cardRef} className={`member-card${generatedCard ? ` rarity-${generatedCard.rarity.toLowerCase()}` : " is-empty"}`} aria-live="polite">
            {generatedCard ? (
              <>
                <header className="member-card-header">
                  <span className="rarity-badge"><Sparkle size={14} weight="fill" aria-hidden="true" /> {generatedCard.rarity}</span>
                  <span className="card-rank"><Trophy size={16} weight="fill" aria-hidden="true" /> Rank #{numberFormatter.format(generatedCard.rank)}</span>
                </header>
                <div className="card-profile">
                  <Avatar user={generatedCard} size="card" />
                  <div>
                    <span>Optimum community member</span>
                    <h3>{generatedCard.name}</h3>
                  </div>
                </div>
                <div className="card-total">
                  <span>Total messages</span>
                  <strong>{numberFormatter.format(generatedCard.total)}</strong>
                </div>
                <div className="card-channels">
                  <span className="card-section-label">Top channels</span>
                  {generatedCard.topChannels.map((channel, index) => (
                    <div className="card-channel" key={`${channel.name}-${index}`}>
                      <span><Hash size={16} weight="bold" aria-hidden="true" /> {cleanChannelName(channel.name)}</span>
                      <strong>{numberFormatter.format(channel.messages)}</strong>
                    </div>
                  ))}
                </div>
                <footer className="member-card-footer">
                  <img src="/assets/optimum-mark-white.png" alt="Optimum" />
                  <span>Community Series · 2026</span>
                </footer>
              </>
            ) : (
              <div className="empty-card-content">
                <span className="empty-card-icon"><Sparkle size={30} weight="duotone" aria-hidden="true" /></span>
                <strong>Your community card will appear here</strong>
                <span>Search any ranked member to reveal their rarity and favorite channels.</span>
              </div>
            )}
          </div>
          {generatedCard && (
            <>
              <div className="card-actions" aria-label="Card actions">
                <button type="button" onClick={downloadCardPng} disabled={cardActionBusy}>
                  <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Download PNG
                </button>
                <button type="button" onClick={copyCardPng} disabled={cardActionBusy}>
                  <Copy size={18} weight="bold" aria-hidden="true" /> Copy PNG
                </button>
                <button className="share-x-button" type="button" onClick={shareCardOnX}>
                  <XLogo size={18} weight="bold" aria-hidden="true" /> Share on X
                </button>
              </div>
              <p className="card-action-status" role="status" aria-live="polite">{cardActionStatus}</p>
            </>
          )}
        </section>
        <section className="twitter-view" aria-labelledby="twitter-title" hidden={activeView !== "twitter"}>
          <img className="generator-symbol symbol-1" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-2" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-3" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <img className="generator-symbol symbol-4" src="/assets/optimum-mark-white.png" alt="" aria-hidden="true" />
          <div className="twitter-soon-content">
            <p className="eyebrow"><XLogo size={18} weight="bold" aria-hidden="true" /> Twitter community standings</p>
            <h2 id="twitter-title">Twitter Leaderboard</h2>
            <strong>SOON</strong>
            <p>Community rankings are on the way.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

