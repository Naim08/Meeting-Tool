'use client';

export default function DashboardView() {
	const mockConversations = [
		{ id: 1, title: 'Technical Interview - Software Engineer', date: 'Today, 2:30 PM', status: 'active' },
		{ id: 2, title: 'System Design - Senior Backend', date: 'Yesterday, 10:15 AM', status: 'completed' },
		{ id: 3, title: 'Behavioral Interview - Team Lead', date: '2 days ago', status: 'completed' },
	];

	const mockTranscript = [
		{ time: '00:05', speaker: 'Interviewer', text: "Let's start with your background. Tell me about yourself." },
		{ time: '00:12', speaker: 'You', text: "I've been working as a software engineer for 5 years..." },
		{ time: '00:45', speaker: 'Interviewer', text: "Great. Can you walk me through how you'd design a URL shortener?" },
		{ time: '01:20', speaker: 'AI', text: '💡 Suggested: Start with requirements (scale, latency), then discuss data models and caching strategy.' },
	];

	return (
		<div className="relative w-full max-w-[975px] mx-auto rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50">
			{/* Glassmorphism header */}
			<div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50 px-6 py-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900">Interview History</h3>
					<div className="flex items-center gap-2">
						<div className="size-2 rounded-full bg-green-500"></div>
						<span className="text-sm text-gray-600">Live</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-gray-200/50">
				{/* Left sidebar - Conversation history */}
				<div className="bg-gray-50/50 p-4 lg:p-6">
					<div className="space-y-3">
						{mockConversations.map((conv) => (
							<div
								key={conv.id}
								className={`p-3 rounded-lg cursor-pointer transition-all ${
									conv.status === 'active'
										? 'bg-blue-50 border border-blue-200 shadow-sm'
										: 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
								}`}
							>
								<div className="flex items-start justify-between gap-2 mb-1">
									<h4 className={`text-sm font-medium ${conv.status === 'active' ? 'text-blue-900' : 'text-gray-900'}`}>
										{conv.title}
									</h4>
									{conv.status === 'active' && (
										<span className="size-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>
									)}
								</div>
								<p className="text-xs text-gray-500">{conv.date}</p>
							</div>
						))}
					</div>

					{/* Action items summary */}
					<div className="mt-6 pt-6 border-t border-gray-200">
						<h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
						<div className="space-y-2 text-sm">
							<div className="flex items-start gap-2">
								<span className="text-blue-600 mt-0.5">•</span>
								<span className="text-gray-700">3 key insights extracted</span>
							</div>
							<div className="flex items-start gap-2">
								<span className="text-blue-600 mt-0.5">•</span>
								<span className="text-gray-700">Follow-up email ready</span>
							</div>
						</div>
					</div>
				</div>

				{/* Right panel - Transcript */}
				<div className="p-4 lg:p-6 bg-white">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-base font-semibold text-gray-900">Live Transcript</h4>
						<button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
							Export
						</button>
					</div>

					<div className="space-y-4 max-h-[400px] overflow-y-auto">
						{mockTranscript.map((entry, index) => (
							<div
								key={index}
								className={`flex gap-3 ${
									entry.speaker === 'AI' ? 'bg-blue-50/50 p-3 rounded-lg border border-blue-100' : ''
								}`}
							>
								<div className="flex-shrink-0">
									<div className={`size-8 rounded-full flex items-center justify-center text-xs font-medium ${
										entry.speaker === 'Interviewer'
											? 'bg-purple-100 text-purple-700'
											: entry.speaker === 'You'
											? 'bg-green-100 text-green-700'
											: 'bg-blue-100 text-blue-700'
									}`}>
										{entry.speaker === 'AI' ? '🤖' : entry.speaker[0]}
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span className="text-xs font-medium text-gray-900">{entry.speaker}</span>
										<span className="text-xs text-gray-400">{entry.time}</span>
									</div>
									<p className="text-sm text-gray-700 leading-relaxed">{entry.text}</p>
								</div>
							</div>
						))}
					</div>

					{/* Quick actions */}
					<div className="mt-6 pt-6 border-t border-gray-200 flex items-center gap-3">
						<button className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
							Generate Follow-up
						</button>
						<button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
							View Notes
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

