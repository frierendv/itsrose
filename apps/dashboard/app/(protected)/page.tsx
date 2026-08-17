export default function DashboardRootPage() {
	return (
		<div className="flex flex-1 flex-col gap-4">
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="aspect-video rounded-2xl bg-default/30 border border-border/60 p-5 flex flex-col justify-between shadow-xs">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted uppercase tracking-wider">
							Total Requests
						</span>
						<span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
							+12.5%
						</span>
					</div>
					<div>
						<div className="text-2xl font-bold tracking-tight text-foreground">
							1,284,930
						</div>
						<p className="text-xs text-muted mt-1">
							Across all API endpoints
						</p>
					</div>
				</div>

				<div className="aspect-video rounded-2xl bg-default/30 border border-border/60 p-5 flex flex-col justify-between shadow-xs">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted uppercase tracking-wider">
							Active Models
						</span>
						<span className="inline-flex items-center rounded-md bg-success/20 px-2 py-0.5 text-xs font-semibold text-success-foreground">
							Online
						</span>
					</div>
					<div>
						<div className="text-2xl font-bold tracking-tight text-foreground">
							24 Models
						</div>
						<p className="text-xs text-muted mt-1">
							Genesis, Explorer, Quantum
						</p>
					</div>
				</div>

				<div className="aspect-video rounded-2xl bg-default/30 border border-border/60 p-5 flex flex-col justify-between shadow-xs">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted uppercase tracking-wider">
							Average Latency
						</span>
						<span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
							Optimal
						</span>
					</div>
					<div>
						<div className="text-2xl font-bold tracking-tight text-foreground">
							42 ms
						</div>
						<p className="text-xs text-muted mt-1">
							Global edge network
						</p>
					</div>
				</div>
			</div>

			<div className="min-h-[50vh] flex-1 rounded-2xl bg-default/30 border border-border/60 p-6 shadow-xs flex flex-col items-center justify-center text-center">
				<div className="max-w-md flex flex-col items-center gap-2">
					<h3 className="text-lg font-semibold text-foreground">
						Welcome to Your Dashboard
					</h3>
					<p className="text-sm text-muted">
						Use the inset sidebar navigation on the left to explore
						models, manage projects, and configure platform
						settings.
					</p>
				</div>
			</div>
		</div>
	);
}
