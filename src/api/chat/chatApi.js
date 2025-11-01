import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api";
import axios from "axios";

// ----------------------
// 1:1 채팅 채널 생성 API
// ----------------------
export const createIndividualChatChannel = async (workSpaceSeq, otherMemberSeq) => {
  const res = await apiPost(
    `/chat-service/chat/channels/individual`,
    { workSpaceSeq, otherMemberSeq }
  );
  return res; // channelSeq 반환
};

// ----------------------
// 1:1 채팅 목록 조회 API
// ----------------------
export const getIndividualChatChannels = async () => {
  // apiGet을 사용하면 자동으로 ResponseDto.data만 추출됨
  const res = await apiGet(
    `/chat-service/chat/channels/individual`
  );
  // res는 이미 배열 (List<MyChatListResDto>)
  return res;
};