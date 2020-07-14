import { createLogger } from "../../common";
import { local, notify, toWorker, safeLocalStorage } from ".";
import type { LogEventShowOptions } from "../../common/types";

const saveEvent = () => {
	throw new Error("UI events should not be saved to DB");
};

const showEvent = ({
	extraClass,
	persistent,
	text,
	type,
}: LogEventShowOptions) => {
	let title;

	if (type === "gameWon" || type === "gameLost" || type === "gameTied") {
		if (safeLocalStorage.getItem("bbgmShowLeagueTopBar") !== "false") {
			return;
		}
	}

	if (type === "error") {
		title = "Error!";
	} else if (type === "changes") {
		title = "Changes since your last visit";
	} else if (type === "healedList") {
		title = "Recovered from injury";
	} else if (type === "injuredList") {
		title = "Injured this game";
	}

	if (persistent && extraClass === undefined) {
		extraClass = "notification-danger";
	}

	// Don't show non-critical notification if we're viewing a live game now. This used to be for "/live" but that would disable all notifications when viewing the live game index. I had only made it that broad to be careful, in case the event triggered before game sim finished, but that doesn't seem to happen.
	if (!window.location.pathname.includes("/live_game") || persistent) {
		notify(text, title, {
			extraClass,
			persistent,
		});

		// Persistent notifications are very rare and should stop game sim when displayed. Run async for performance
		if (persistent) {
			toWorker("main", "getLocal", "autoPlayUntil").then(autoPlayUntil => {
				if (!autoPlayUntil) {
					toWorker("main", "lockSet", "stopGameSim", true);
				}
			});
		}
	}

	// Hacky way to make sure there is room for the multi team mode menu
	const notificationContainer = document.getElementById(
		"notification-container",
	);

	if (
		local.getState().userTids !== undefined &&
		local.getState().userTids.length > 1 &&
		notificationContainer &&
		!notificationContainer.classList.contains(
			"notification-container-extra-margin-bottom",
		)
	) {
		notificationContainer.classList.add(
			"notification-container-extra-margin-bottom",
		);
	} else if (
		local.getState().userTids !== undefined &&
		local.getState().userTids.length === 1 &&
		notificationContainer &&
		notificationContainer.classList.contains(
			"notification-container-extra-margin-bottom",
		)
	) {
		notificationContainer.classList.remove(
			"notification-container-extra-margin-bottom",
		);
	}
};

const logEvent = createLogger(saveEvent, showEvent);

export { logEvent as default, showEvent };
