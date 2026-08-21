#include "story_engine.h"
#include <stdio.h>
#include <string.h>

static void json_escape(const char *src, char *dst, size_t n) {
    size_t j = 0;
    if (!n) return;
    for (size_t i = 0; src && src[i] && j + 2 < n; ++i) {
        const char c = src[i];
        if (c == '"' || c == '\\') { dst[j++] = '\\'; dst[j++] = c; }
        else if (c == '\n') { dst[j++]='\\'; dst[j++]='n'; }
        else if ((unsigned char)c >= 32) dst[j++] = c;
    }
    dst[j] = '\0';
}

const char *jm_stage_name(JMStoryStage stage) {
    static const char *names[JM_STAGE_COUNT] = {
        "ordinary_state", "moment", "response", "changed_route", "restored_state", "meaningful_after"
    };
    return (stage >= 0 && stage < JM_STAGE_COUNT) ? names[stage] : "unknown";
}

JMBuildGateReceipt jm_story_validate(const JMStoryBody *story) {
    JMBuildGateReceipt r = {1, 0};
    if (!story || !story->title[0]) { r.complete = 0; r.missing_mask |= 1u << 31; }
    for (int i = 0; i < JM_STAGE_COUNT; ++i) {
        if (!story || !story->stages[i][0]) { r.complete = 0; r.missing_mask |= 1u << i; }
    }
    return r;
}

int jm_story_to_json(const JMStoryBody *story, char *out, size_t out_size) {
    if (!story || !out || out_size < 64) return -1;
    JMBuildGateReceipt gate = jm_story_validate(story);
    char title[JM_TITLE_MAX * 2], id[128], parent[128], reason[JM_TEXT_MAX * 2];
    json_escape(story->title, title, sizeof title); json_escape(story->id, id, sizeof id);
    json_escape(story->parent_id, parent, sizeof parent); json_escape(story->birth_reason, reason, sizeof reason);
    int used = snprintf(out, out_size,
        "{\n  \"office\": \"STORYBODY\",\n  \"complete\": %s,\n  \"missing_mask\": %u,\n  \"id\": \"%s\",\n  \"title\": \"%s\",\n  \"parent_id\": \"%s\",\n  \"birth_reason\": \"%s\",\n  \"stages\": {\n",
        gate.complete ? "true" : "false", gate.missing_mask, id, title, parent, reason);
    if (used < 0 || (size_t)used >= out_size) return -2;
    for (int i = 0; i < JM_STAGE_COUNT; ++i) {
        char text[JM_TEXT_MAX * 2]; json_escape(story->stages[i], text, sizeof text);
        int n = snprintf(out + used, out_size - (size_t)used, "    \"%s\": \"%s\"%s\n", jm_stage_name((JMStoryStage)i), text, i == JM_STAGE_COUNT - 1 ? "" : ",");
        if (n < 0 || (size_t)n >= out_size - (size_t)used) return -3;
        used += n;
    }
    int n = snprintf(out + used, out_size - (size_t)used, "  }\n}\n");
    return (n < 0 || (size_t)n >= out_size - (size_t)used) ? -4 : used + n;
}

#ifdef JM_VERBALLAGE_DEMO
int main(void) {
    JMStoryBody s = {
        .id = "JM-C-DEMO-001",
        .title = "The Returned Room",
        .parent_id = "BROKEN-CHAT",
        .birth_reason = "A restored route returns after a new route already exists.",
        .stages = {
            "A creator works inside one active room.",
            "The room stops responding.",
            "The creator carries the work elsewhere.",
            "A second room develops its own purpose.",
            "The first room returns and remains usable.",
            "Both rooms now exist, so restoration cannot reverse the history."
        }
    };
    char json[16384];
    int n = jm_story_to_json(&s, json, sizeof json);
    if (n < 0) return 1;
    fputs(json, stdout);
    return 0;
}
#endif
