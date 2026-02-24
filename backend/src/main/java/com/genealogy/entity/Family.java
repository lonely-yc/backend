package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_family")
public class Family {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String surname;

    private String description;

    private String avatarUrl;

    private Integer memberCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
