package com.genealogy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RelationDTO {

    private Long id;

    @NotNull(message = "起始人物ID不能为空")
    private Long fromId;

    @NotNull(message = "目标人物ID不能为空")
    private Long toId;

    @NotBlank(message = "关系类型不能为空")
    private String type;
}
