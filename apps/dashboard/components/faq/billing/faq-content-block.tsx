/**
 * Parses inline tokens (**bold** and `code`) within a single text string.
 */
function FormattedText({ text }: { text: string }) {
	const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

	return (
		<>
			{parts.map((part, index) => {
				if (part.startsWith("**") && part.endsWith("**")) {
					return (
						<strong
							key={index}
							className="font-semibold text-foreground"
						>
							{part.slice(2, -2)}
						</strong>
					);
				}
				if (part.startsWith("`") && part.endsWith("`")) {
					return (
						<code
							key={index}
							className="px-1.5 py-0.5 font-mono text-xs text-foreground bg-default"
						>
							{part.slice(1, -1)}
						</code>
					);
				}
				return part;
			})}
		</>
	);
}

/**
 * Splits raw FAQ multiline content into formatted paragraphs and bullet lists.
 */
export function FaqContentBlock({ content }: { content: string }) {
	const paragraphs = content.split("\n\n");

	return (
		<div className="space-y-2.5">
			{paragraphs.map((paragraph, pIdx) => {
				const isList =
					paragraph.startsWith("•") || paragraph.includes("\n•");

				if (isList) {
					const lines = paragraph
						.split("\n")
						.map((l) => l.trim())
						.filter(Boolean);

					return (
						<ul key={pIdx} className="space-y-2 pl-0.5">
							{lines.map((line, lIdx) => (
								<li
									key={lIdx}
									className="flex items-start gap-2"
								>
									<span className="text-accent shrink-0 select-none text-xs leading-5">
										•
									</span>
									<span className="text-xs sm:text-sm text-muted leading-relaxed">
										<FormattedText
											text={line.replace(
												/^[•\-*]\s*/,
												""
											)}
										/>
									</span>
								</li>
							))}
						</ul>
					);
				}

				return (
					<p
						key={pIdx}
						className="text-xs sm:text-sm text-muted leading-relaxed"
					>
						<FormattedText text={paragraph} />
					</p>
				);
			})}
		</div>
	);
}
