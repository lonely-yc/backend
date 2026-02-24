package com.genealogy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FamilyDTO {

    @NotBlank(message = "姓氏不能为空")
    private String surname;

    private String description;

    private String avatarUrl;
}
