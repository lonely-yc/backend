package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 操作日志实体
 */
@Data
@TableName("t_operate_log")
public class OperateLog {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 操作类型: PERSON_ADD/PERSON_EDIT/PERSON_DELETE/RELATION_ADD/RELATION_DELETE/EVENT_ADD/EVENT_EDIT/EVENT_DELETE */
    private String operateType;

    /** 操作类型描述 */
    private String operateTypeDesc;

    /** 操作人ID */
    private Long userId;

    /** 操作人名称 */
    private String userName;

    /** 关联对象ID（人物ID/关系ID/事件ID） */
    private Long targetId;

    /** 关联对象名称（人物姓名等） */
    private String targetName;

    /** 操作类型: PERSON/RELATION/EVENT/FAMILY */
    private String targetType;

    /** 家族ID */
    private Long familyId;

    /** 操作详情（JSON格式，记录变更前后数据） */
    private String detail;

    /** 操作时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 操作类型枚举 */
    public static class OperateType {
        public static final String PERSON_ADD = "PERSON_ADD";
        public static final String PERSON_EDIT = "PERSON_EDIT";
        public static final String PERSON_DELETE = "PERSON_DELETE";
        public static final String RELATION_ADD = "RELATION_ADD";
        public static final String RELATION_DELETE = "RELATION_DELETE";
        public static final String EVENT_ADD = "EVENT_ADD";
        public static final String EVENT_EDIT = "EVENT_EDIT";
        public static final String EVENT_DELETE = "EVENT_DELETE";
        public static final String FAMILY_ADD = "FAMILY_ADD";
        public static final String FAMILY_EDIT = "FAMILY_EDIT";
        public static final String FAMILY_DELETE = "FAMILY_DELETE";

        public static String getDesc(String type) {
            switch (type) {
                case PERSON_ADD: return "添加人物";
                case PERSON_EDIT: return "编辑人物";
                case PERSON_DELETE: return "删除人物";
                case RELATION_ADD: return "添加关系";
                case RELATION_DELETE: return "删除关系";
                case EVENT_ADD: return "添加事件";
                case EVENT_EDIT: return "编辑事件";
                case EVENT_DELETE: return "删除事件";
                case FAMILY_ADD: return "创建家族";
                case FAMILY_EDIT: return "编辑家族";
                case FAMILY_DELETE: return "删除家族";
                default: return "未知操作";
            }
        }
    }
}
