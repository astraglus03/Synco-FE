<!-- <template>
  <v-dialog v-model="isOpen" max-width="700px" @click:outside="closeModal">
    <v-card class="poll-modal">
      <v-card-title class="poll-header">
        <div class="header-content">
          <v-icon class="header-icon">mdi-poll</v-icon>
          <div class="header-text">
            <h2 class="header-title">새 투표 만들기</h2>
            <p class="header-subtitle">팀원들의 의견을 수집해보세요</p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeModal"
          class="close-btn"
        ></v-btn>
      </v-card-title>

      <v-card-text class="poll-content">
        <!-- 투표 제목 -->
        <div class="input-section">
          <label class="input-label">투표 제목</label>
          <v-text-field
            v-model="pollData.title"
            placeholder="예: 다음 주 회의 시간을 정해주세요"
            variant="outlined"
            class="poll-input"
            hide-details
          ></v-text-field>
        </div>

        <!-- 투표 마감 일자 -->
        <div class="input-section">
          <label class="input-label">마감 시간</label>
          <v-text-field
            v-model="pollData.deadline"
            type="datetime-local"
            variant="outlined"
            class="poll-input"
            hide-details
          ></v-text-field>
        </div>

        <!-- 투표 항목들 -->
        <div class="input-section">
          <div class="section-header">
            <label class="input-label">투표 항목</label>
            <v-btn
              size="small"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="addOption"
              class="add-option-btn"
            >
              항목 추가
            </v-btn>
          </div>

          <div class="options-container">
            <div
              v-for="(option, index) in pollData.options"
              :key="index"
              class="option-item"
            >
              <div class="option-number">{{ index + 1 }}</div>
              <v-text-field
                v-model="option.text"
                :placeholder="`항목 ${index + 1}을 입력하세요`"
                variant="outlined"
                density="comfortable"
                class="option-input"
                hide-details
              ></v-text-field>
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="removeOption(index)"
                :disabled="pollData.options.length <= 2"
                class="delete-btn"
              ></v-btn>
            </div>
          </div>
        </div>

        <!-- 복수 선택 허용 -->
        <div class="checkbox-section">
          <v-checkbox
            v-model="pollData.allowMultiple"
            label="복수 선택 허용"
            color="primary"
            hide-details
            class="multiple-checkbox"
          ></v-checkbox>
          <p class="checkbox-desc">여러 항목을 선택할 수 있습니다</p>
        </div>
      </v-card-text>

      <v-card-actions class="poll-actions">
        <v-btn variant="text" @click="closeModal" class="cancel-btn"
          >취소</v-btn
        >
        <v-btn
          color="primary"
          @click="createPoll"
          :disabled="!isValidPoll"
          class="create-btn"
          size="large"
        >
          <v-icon class="mr-2">mdi-rocket-launch</v-icon>
          투표 시작하기
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "create-poll"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const pollData = ref({
  title: "",
  deadline: "",
  options: [{ text: "" }, { text: "" }],
  allowMultiple: false,
});

const isValidPoll = computed(() => {
  return (
    pollData.value.title.trim() !== "" &&
    pollData.value.deadline !== "" &&
    pollData.value.options.every((option) => option.text.trim() !== "") &&
    pollData.value.options.length >= 2
  );
});

const addOption = () => {
  pollData.value.options.push({ text: "" });
};

const removeOption = (index) => {
  if (pollData.value.options.length > 2) {
    pollData.value.options.splice(index, 1);
  }
};

const createPoll = () => {
  if (isValidPoll.value) {
    emit("create-poll", {
      ...pollData.value,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: "active",
      votes: [],
    });
    resetForm();
    closeModal();
  }
};

const resetForm = () => {
  pollData.value = {
    title: "",
    deadline: "",
    options: [{ text: "" }, { text: "" }],
    allowMultiple: false,
  };
};

const closeModal = () => {
  isOpen.value = false;
};

// ESC 키 이벤트 리스너
const handleKeydown = (event) => {
  if (event.key === "Escape" && isOpen.value) {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});

// 모달이 열릴 때 현재 시간을 기본값으로 설정
watch(isOpen, (newValue) => {
  if (newValue) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // 30분 후로 기본 설정
    pollData.value.deadline = now.toISOString().slice(0, 16);
  }
});
</script>

<style scoped>
.poll-modal {
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.poll-header {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)) 0%,
    rgba(var(--v-theme-primary), 0.8) 100%
  );
  color: white;
  padding: 24px 32px;
  position: relative;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 32px;
  opacity: 0.9;
}

.header-text {
  flex: 1;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 4px 0 0 0;
  font-weight: 400;
}

.close-btn {
  color: white !important;
  position: absolute;
  top: 16px;
  right: 16px;
}

.poll-content {
  padding: 32px;
  background: rgb(var(--v-theme-surface));
}

.input-section {
  margin-bottom: 32px;
}

.input-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 12px;
}

.poll-input {
  font-size: 16px;
}

.poll-input :deep(.v-field) {
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.add-option-btn {
  border-radius: 8px;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
  color: white !important;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition: all 0.2s ease;
}

.option-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.option-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.option-input {
  flex: 1;
}

.option-input :deep(.v-field) {
  border-radius: 8px;
  background: white;
}

.delete-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.checkbox-section {
  background: rgba(var(--v-theme-primary), 0.05);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.multiple-checkbox {
  margin-bottom: 8px;
}

.checkbox-desc {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
  font-style: italic;
}

.poll-actions {
  padding: 24px 32px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  gap: 16px;
}

.cancel-btn {
  font-weight: 600;
  text-transform: none;
  padding: 0 24px;
}

.create-btn {
  font-weight: 700;
  text-transform: none;
  padding: 0 32px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.4);
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)) 0%,
    rgba(var(--v-theme-primary), 0.8) 100%
  );
  color: white !important;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.5);
}

.create-btn:disabled {
  transform: none;
  box-shadow: none;
  opacity: 0.5;
}

/* 반응형 디자인 */
@media (max-width: 600px) {
  .poll-modal {
    margin: 16px;
  }

  .poll-header {
    padding: 20px 24px;
  }

  .header-title {
    font-size: 20px;
  }

  .poll-content {
    padding: 24px;
  }

  .poll-actions {
    padding: 20px 24px;
    flex-direction: column;
  }

  .create-btn,
  .cancel-btn {
    width: 100%;
  }
}
</style> -->
