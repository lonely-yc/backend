package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_person")
public class Person {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long familyId;

    private String name;

    private String gender;

    private Integer generation;

    private String birthDate;

    private String deathDate;

    private String birthPlace;

    private String bio;

    private String avatarUrl;

    private Boolean isStarred;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
