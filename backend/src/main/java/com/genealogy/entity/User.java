package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_user")
public class User {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String username;

    private String passwordHash;

    private String displayName;

    private String role;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
