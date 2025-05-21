import api, { API_ENDPOINTS } from "../config/api";
import { message } from "antd";

interface BatchMatch {
  first_player: "first" | "second";
  win: "first" | "second";
}

interface BatchSubmitValues {
  environment_id: number;
  match_type_id: number;
  first_deck_id: number;
  second_deck_id: number;
  matches: BatchMatch[];
  ignore_first_player: boolean;
}

export const handleBatchSubmit = async (values: BatchSubmitValues) => {
  try {
    const {
      environment_id,
      match_type_id,
      first_deck_id,
      second_deck_id,
      matches,
      ignore_first_player,
    } = values;
    const matchResults = matches.map((match) => {
      const winning_deck_id =
        match.win === "first" ? first_deck_id : second_deck_id;
      const losing_deck_id =
        match.win === "first" ? second_deck_id : first_deck_id;
      
      const actual_first_deck_id = ignore_first_player ? 0 : match.first_player === "first" ? first_deck_id : second_deck_id;
      const actual_second_deck_id = ignore_first_player ? 0 : match.first_player === "first" ? second_deck_id : first_deck_id;
      
      return {
        environment_id,
        match_type_id,
        first_deck_id: actual_first_deck_id,
        second_deck_id: actual_second_deck_id,
        winning_deck_id,
        losing_deck_id,
      };
    });

    await api.post(`${API_ENDPOINTS.MATCH_RESULTS}batch/`, {
      match_results: matchResults,
    });
    message.success("添加成功");
    return true;
  } catch {
    message.error("添加失败");
    return false;
  }
}; 