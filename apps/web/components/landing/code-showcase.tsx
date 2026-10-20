"use client";

import { Check, Copy, Terminal } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/styles";
import { AnimatePresence, motion } from "motion/react";
import NextLink from "next/link";
import { useState } from "react";

type CodeLang = "typescript" | "python" | "curl";

const CODE_EXAMPLES: Record<
	CodeLang,
	{ label: string; file: string; code: string }
> = {
	typescript: {
		label: "TypeScript / Next.js",
		file: "api/generate.ts",
		code: `import { ItsRose } from "@itsrose/react";

// Initialize client with your private edge key
const client = new ItsRose({
  apiKey: process.env.ITSROSE_API_KEY,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Execute sub-50ms FLUX.1 generative image inference
  const result = await client.image.fluxSchnell({
    prompt,
    width: 1024,
    height: 1024,
    steps: 4,
  });

  return Response.json({
    imageUrl: result.output_url,
    latency: result.latency_ms,
  });
}`,
	},
	python: {
		label: "Python / FastAPI",
		file: "main.py",
		code: `import os
from itsrose import ItsRoseClient

client = ItsRoseClient(api_key=os.environ["ITSROSE_API_KEY"])

# Execute OCR document extraction with automatic language detection
response = client.vision.ocr(
    image_url="https://assets.itsrose.net/sample-receipt.png",
    languages=["en", "id", "ja"],
    detect_orientation=True
)

print(f"Extracted Text: {response.extracted_text}")
print(f"Inference Latency: {response.latency_ms}ms")`,
	},
	curl: {
		label: "cURL / CLI",
		file: "terminal",
		code: `curl -X POST https://api.itsrose.net/v2/image/flux-schnell \\
  -H "Authorization: Bearer rose_live_92a01bc8" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Futuristic cloud datacenter with illuminated fibers",
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'`,
	},
};

export function CodeShowcase() {
	const [selectedLang, setSelectedLang] = useState<CodeLang>("typescript");
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(CODE_EXAMPLES[selectedLang].code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section
			id="code"
			aria-labelledby="code-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
					{/* Left Column: Developer Story (Left-aligned) */}
					<div className="flex flex-col items-start text-left lg:col-span-5">
						<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
							<Terminal className="size-3.5 text-accent" />
							<span className="font-semibold text-accent uppercase tracking-wider">
								Developer Experience
							</span>
						</div>

						<h2
							id="code-heading"
							className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
						>
							Integrate in minutes. No infrastructure debt.
						</h2>

						<p className="mt-4 text-base text-muted leading-relaxed">
							Forget managing custom GPU clusters, downloading
							checkpoint weights, or setting up autoscaling
							groups. ItsRose turns complex multimodal AI
							pipelines into simple, reliable function calls.
						</p>

						<div className="mt-8 space-y-4">
							<div className="border border-border bg-surface p-4">
								<div className="font-semibold text-foreground text-sm">
									Full IDE Autocompletion
								</div>
								<p className="mt-1 text-muted text-xs leading-relaxed">
									Strictly typed parameters for all image,
									audio, vision, and scraper routes so you
									never guess API parameters.
								</p>
							</div>

							<div className="border border-border bg-surface p-4">
								<div className="font-semibold text-foreground text-sm">
									Built-in Connection Pooling
								</div>
								<p className="mt-1 text-muted text-xs leading-relaxed">
									HTTP keep-alives and multiplexed HTTP/2
									channels maintain persistent warm sessions
									with closest edge points.
								</p>
							</div>
						</div>

						<div className="mt-8 flex items-center gap-4">
							<NextLink
								href="https://github.com/xct007"
								className={buttonVariants({
									variant: "outline",
									size: "md",
								})}
							>
								View GitHub Repository
							</NextLink>
							<NextLink
								href="https://dash.itsrose.net"
								className={buttonVariants({
									variant: "primary",
									size: "md",
								})}
							>
								Get API Credentials
							</NextLink>
						</div>
					</div>

					{/* Right Column: Interactive Code Console */}
					<div className="lg:col-span-7">
						<div className="overflow-hidden border border-border bg-surface shadow-xl">
							{/* Console Header Bar */}
							<div className="flex items-center justify-between border-border border-b bg-surface-secondary px-4 py-2.5">
								<div className="flex items-center gap-2">
									{(
										[
											"typescript",
											"python",
											"curl",
										] as CodeLang[]
									).map((lang) => (
										<button
											key={lang}
											type="button"
											onClick={() =>
												setSelectedLang(lang)
											}
											className={`px-3 py-1 font-mono text-xs transition-colors ${
												selectedLang === lang
													? "border border-border bg-surface font-semibold text-accent"
													: "text-muted hover:text-foreground"
											}`}
										>
											{CODE_EXAMPLES[lang].label}
										</button>
									))}
								</div>

								<div className="flex items-center gap-2">
									<span className="hidden font-mono text-[11px] text-muted sm:inline">
										{CODE_EXAMPLES[selectedLang].file}
									</span>
									<button
										type="button"
										onClick={handleCopy}
										aria-label="Copy code block"
										className="flex size-7 items-center justify-center text-muted transition-colors hover:text-foreground"
									>
										{copied ? (
											<Check className="size-3.5 text-accent" />
										) : (
											<Copy className="size-3.5" />
										)}
									</button>
								</div>
							</div>

							{/* Code Block with line styling */}
							<div className="overflow-x-auto bg-surface-tertiary/40 p-4 font-mono text-xs leading-relaxed">
								<AnimatePresence mode="wait">
									<motion.pre
										key={selectedLang}
										initial={{ opacity: 0, y: 3 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										className="text-foreground/90"
									>
										<code>
											{CODE_EXAMPLES[selectedLang].code}
										</code>
									</motion.pre>
								</AnimatePresence>
							</div>

							{/* Console Footnote */}
							<div className="flex items-center justify-between border-border border-t bg-surface-secondary px-4 py-2 text-[11px] text-muted">
								<span>SDK Version: @itsrose/react v2.1.0</span>
								<span>
									Runtime: Node 18+ / Edge / Bun / Python
									3.10+
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
