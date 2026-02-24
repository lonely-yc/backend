package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_relation")
public class Relation {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long fromId;

    private Long toId;

    /** parent-child / spouse / adopted */
    private String type;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
