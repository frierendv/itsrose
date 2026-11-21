import { formatPlaybackTime } from "../format-playback-time";

describe("formatPlaybackTime", () => {
	it("pads the seconds to two digits", () => {
		expect(formatPlaybackTime(0)).toBe("0:00");
		expect(formatPlaybackTime(5)).toBe("0:05");
		expect(formatPlaybackTime(59)).toBe("0:59");
	});

	it("rolls seconds into minutes and leaves minutes uncapped", () => {
		expect(formatPlaybackTime(60)).toBe("1:00");
		expect(formatPlaybackTime(65)).toBe("1:05");
		expect(formatPlaybackTime(3599)).toBe("59:59");
		expect(formatPlaybackTime(3600)).toBe("60:00");
	});

	it("floors a fractional position", () => {
		expect(formatPlaybackTime(83.9)).toBe("1:23");
	});

	it("treats an unavailable or negative position as the start", () => {
		expect(formatPlaybackTime(-1)).toBe("0:00");
		expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
		expect(formatPlaybackTime(Number.POSITIVE_INFINITY)).toBe("0:00");
	});
});
