package com.college.labselect.service;

import com.college.labselect.dto.req.StudentCreateReqDTO;
import com.college.labselect.dto.req.StudentStatusReqDTO;
import com.college.labselect.dto.req.StudentUpdateReqDTO;
import com.college.labselect.dto.resp.StudentImportResultVO;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.StudentAccountServiceImpl;
import com.college.labselect.utils.StudentExcelParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 学生账号服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StudentAccountServiceTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private StudentExcelParser studentExcelParser;

    @InjectMocks
    private StudentAccountServiceImpl studentAccountService;

    /**
     * 快乐路径：新增学生同时写入账号与学生档案。
     */
    @Test
    void createStudent_success_shouldInsertUserAndProfile() {
        when(sysUserMapper.selectCount(any())).thenReturn(0L);
        when(sysUserMapper.insert(any(SysUser.class))).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            user.setId(1001L);
            return 1;
        });
        when(studentProfileMapper.insert(any(StudentProfile.class))).thenReturn(1);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encoded");

        Long userId = studentAccountService.createStudent(createReq("20220001"));

        assertThat(userId).isEqualTo(1001L);
        ArgumentCaptor<SysUser> captor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).insert(captor.capture());
        assertThat(captor.getValue().getUserType()).isEqualTo(1);
        assertThat(captor.getValue().getNeedChangePwd()).isEqualTo(1);
        verify(studentProfileMapper).insert(any(StudentProfile.class));
    }

    /**
     * 边界：学号已存在返回 400002。
     */
    @Test
    void createStudent_duplicateUserNo_shouldThrow400002() {
        when(sysUserMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> studentAccountService.createStudent(createReq("20220001")), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：编辑不存在的学生返回 404001。
     */
    @Test
    void updateStudent_notFound_shouldThrow404001() {
        when(sysUserMapper.selectById(999L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> studentAccountService.updateStudent(999L, updateReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 快乐路径：禁用学生同步更新账号状态。
     */
    @Test
    void updateStatus_disable_shouldUpdateAccountStatus() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(sysUserMapper.updateById(any(SysUser.class))).thenReturn(1);

        StudentStatusReqDTO req = new StudentStatusReqDTO();
        req.setStatus(0);
        studentAccountService.updateStatus(1001L, req);

        verify(sysUserMapper).updateById(any(SysUser.class));
    }

    /**
     * 快乐路径：重置密码后置需改密标记。
     */
    @Test
    void resetPassword_success_shouldMarkNeedChangePwd() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encoded");
        when(sysUserMapper.updateById(any(SysUser.class))).thenReturn(1);

        studentAccountService.resetPassword(1001L);

        ArgumentCaptor<SysUser> captor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).updateById(captor.capture());
        assertThat(captor.getValue().getNeedChangePwd()).isEqualTo(1);
    }

    /**
     * 边界：批量导入重复学号时跳过该行并返回失败明细。
     */
    @Test
    void importStudents_duplicateUserNo_shouldReturnFailDetail() {
        MultipartFile file = mock(MultipartFile.class);
        when(studentExcelParser.parse(file)).thenReturn(List.of(
                importRow(2, "20229999"),
                importRow(3, "20220001")));
        when(sysUserMapper.selectCount(any())).thenReturn(0L, 1L);
        when(sysUserMapper.insert(any(SysUser.class))).thenReturn(1);
        when(studentProfileMapper.insert(any(StudentProfile.class))).thenReturn(1);

        StudentImportResultVO result = studentAccountService.importStudents(file);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailCount()).isEqualTo(1);
        assertThat(result.getFailList()).hasSize(1);
        assertThat(result.getFailList().get(0).getUserNo()).isEqualTo("20220001");
        assertThat(result.getFailList().get(0).getReason()).isEqualTo("学号已存在");
    }

    private StudentCreateReqDTO createReq(String userNo) {
        StudentCreateReqDTO req = new StudentCreateReqDTO();
        req.setUserNo(userNo);
        req.setRealName("陈爱丽");
        req.setCollege("计算机学院");
        req.setMajor("软件工程");
        req.setGrade("2022");
        req.setPhone("13800000001");
        req.setEmail("chenaili@example.com");
        req.setStatus(1);
        return req;
    }

    private StudentUpdateReqDTO updateReq() {
        StudentUpdateReqDTO req = new StudentUpdateReqDTO();
        req.setRealName("陈爱丽");
        req.setCollege("计算机学院");
        req.setMajor("软件工程");
        req.setGrade("2022");
        req.setPhone("13800000001");
        req.setEmail("chenaili@example.com");
        req.setStatus(1);
        return req;
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        user.setStatus(1);
        user.setNeedChangePwd(1);
        return user;
    }

    private StudentExcelParser.Row importRow(int rowNo, String userNo) {
        StudentExcelParser.Row row = new StudentExcelParser.Row();
        row.setRowNo(rowNo);
        row.setUserNo(userNo);
        row.setRealName("测试学生");
        row.setCollege("计算机学院");
        row.setMajor("软件工程");
        row.setGrade("2022");
        row.setPhone("13800000009");
        row.setEmail("test@example.com");
        return row;
    }
}
