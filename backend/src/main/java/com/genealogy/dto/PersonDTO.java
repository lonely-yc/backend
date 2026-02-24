package com.genealogy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PersonDTO {

    private Long id;

    private Long familyId;

    @NotBlank(message = "姓名不能为空")
    private String name;

    @NotBlank(message = "性别不能为空")
    private String gender;

    @NotNull(message = "世代不能为空")
    private Integer generation;

    private String birthDate;
    private String deathDate;
    private String birthPlace;
    private String bio;
    private String avatarUrl;
    private Boolean isStarred;
}
