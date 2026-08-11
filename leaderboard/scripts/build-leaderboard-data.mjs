import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const sourcePath = resolve(projectDir, "..", "users.json");
const outputPath = resolve(projectDir, "public", "leaderboard-data.json");

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const channelTotals = new Map();

for (const user of source) {
  const counts = Object.values(user)[4] ?? {};
  for (const [channel, value] of Object.entries(counts)) {
    channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + (Number(value) || 0));
  }
}

const channels = [...channelTotals.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([name, total], index) => ({ index, name, total }));
const channelIndex = new Map(channels.map(({ name, index }) => [name, index]));

const users = source.map((user) => {
  const [id, nickname, tagname, avatar, rawCounts] = Object.values(user);
  const counts = rawCounts ?? {};
  const pairs = Object.entries(counts)
    .map(([channel, value]) => [channelIndex.get(channel), Number(value) || 0])
    .filter(([, value]) => value > 0)
    .sort((a, b) => a[0] - b[0]);
  const total = pairs.reduce((sum, [, value]) => sum + value, 0);
  const displayName = nickname || tagname || `Member ${id}`;
  return [String(id), String(displayName), avatar || "", total, pairs.length, pairs.flat()];
});

const payload = {
  generatedAt: new Date().toISOString(),
  sourceUsers: source.length,
  totalMessages: channels.reduce((sum, channel) => sum + channel.total, 0),
  channels,
  users,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(payload));
console.log(`Wrote ${users.length.toLocaleString("en-US")} members and ${channels.length} channels to ${outputPath}`);
