#ifndef JM_VERBALLAGE_STORY_ENGINE_H
#define JM_VERBALLAGE_STORY_ENGINE_H

#include <stddef.h>

#define JM_STAGE_COUNT 6
#define JM_TEXT_MAX 1024
#define JM_TITLE_MAX 160

typedef enum {
    JM_ORDINARY_STATE = 0,
    JM_MOMENT_TRIGGER,
    JM_RESPONSE,
    JM_CHANGED_ROUTE,
    JM_RESTORED_STATE,
    JM_MEANINGFUL_AFTER
} JMStoryStage;

typedef struct {
    char id[64];
    char title[JM_TITLE_MAX];
    char parent_id[64];
    char birth_reason[JM_TEXT_MAX];
    char stages[JM_STAGE_COUNT][JM_TEXT_MAX];
} JMStoryBody;

typedef struct {
    int complete;
    unsigned missing_mask;
} JMBuildGateReceipt;

JMBuildGateReceipt jm_story_validate(const JMStoryBody *story);
int jm_story_to_json(const JMStoryBody *story, char *out, size_t out_size);
const char *jm_stage_name(JMStoryStage stage);

#endif
