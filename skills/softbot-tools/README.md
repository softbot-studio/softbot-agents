# softbot-tools (agent skill)

An Agent Skill (SKILL.md) that teaches coding agents such as Claude Code, Cursor and Codex when and how to use Softbot Studio's pay-per-call tools through the `softbot-mcp` MCP server. The tools cover web page to markdown, structured extraction, screenshots and PDFs, email and domain checks, website trust checks, and Solana token and wallet safety checks.

- **Paid service, disclosed:** the tools are x402 HTTP APIs hosted by Softbot Studio. After a free trial of 3 calls per tool per wallet, each call costs $0.002–$0.01 in USDC, paid from the user's own Solana wallet. The skill tells the agent to confirm with the user before spending.
- **No code:** the skill contains only instructions (`SKILL.md`) and a reference file (`references/tools.md`).
- **Install:** copy the `softbot-tools/` folder into your agent's skills directory (e.g. `~/.claude/skills/`), then follow the setup section of `SKILL.md` to add the MCP server.

Source and issues: https://github.com/softbot-studio/softbot-agents
