export type FaqItem = {
	id: string;
	question: string;
	answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
	{
		id: "faq-1",
		question: "What is ItsRose Platform?",
		answer: "ItsRose is a unified AI and media extraction gateway. Instead of integrating and maintaining separate providers for computer vision (MTXX & Remini), audio synthesis (ElevenLabs), conversational personas (Character.AI), and media downloaders (TikTok & Instagram), ItsRose gives you a single, standardized, high-speed API with unified billing and developer tooling.",
	},
	{
		id: "faq-2",
		question: "How do API keys and authentication work?",
		answer: "Authentication uses standard HTTP Bearer tokens. Once you sign up and access your dashboard, you can instantly generate production API keys and pass them in the `Authorization: Bearer <YOUR_API_KEY>` header with every request.",
	},
	{
		id: "faq-3",
		question: "What are the rate limits and concurrency quotas?",
		answer: "The Free tier includes 10 Requests Per Minute (RPM) with 24-hour log retention. The Pro Plan provides up to 300 RPM with priority queue routing and 30-day logs, while Business plans offer 1,000 RPM with 90-day logs. Custom higher concurrency is available on Enterprise plans.",
	},
	{
		id: "faq-4",
		question: "Is there a TypeScript SDK available?",
		answer: "Yes. All ItsRose endpoints are fully typed and supported through our official npm client packages (`@itsrose/rest-client` and `@itsrose/*` feature packages). You get complete autocompletion, parameter validation, and type-safe response data.",
	},
	{
		id: "faq-5",
		question: "How does media processing and output delivery work?",
		answer: "Endpoints accept both direct public media URLs and file uploads. Resulting media (processed images, synthesized audio, or extracted video streams) are optimized and served via high-speed global CDN edge endpoints with low latency.",
	},
	{
		id: "faq-6",
		question: "Can I use ItsRose APIs for commercial products?",
		answer: "Yes! All paid tiers (Hobby, Pro, and Business) include commercial usage rights, predictable monthly billing, and high-availability production infrastructure.",
	},
];
