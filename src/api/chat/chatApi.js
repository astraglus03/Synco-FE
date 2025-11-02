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

// ----------------------
// 채널 나가기 API (1:1 채팅방 포함)
// ----------------------
export const leaveChannel = async (channelSeq) => {
  const res = await apiDelete(
    `/chat-service/chat/channels/${channelSeq}/leave`
  );
  return res;
};

// ----------------------
// 채널 멤버 조회 API (1:1 채팅 상대방 정보 조회용)
// ----------------------
export const getChannelMembers = async (channelSeq) => {
  const res = await apiGet(
    `/chat-service/chat/channels/${channelSeq}/members`
  );
  return res; // List<IndividualChatUserResDto>
};

// ----------------------
// 마지막 읽은 메시지 업데이트 API (채널 접속 시 사용)
// ----------------------
export const updateLastRead = async (channelSeq) => {
  const res = await apiPost(
    `/chat-service/chat/channels/${channelSeq}/read`
  );
  return res;
};