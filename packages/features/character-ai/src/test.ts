import { CAIClient } from "./client";

const cai = new CAIClient();

// const character = await cai.searchCharacter({ query: "mom" });
// console.debug(character.characters);
const chat = await cai.chat.sendMessage({
	external_id: "5P_Mnn6osZt6562X663o8viR-3v5r_UtbA1HgtgVGJs",
	message:
		"Hai momy. Yuk kita ngentot bareng, aku lagi sange nih... Plisss kita ngentot.",
});
console.debug(chat);
