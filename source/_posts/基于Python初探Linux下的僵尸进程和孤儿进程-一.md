---
title: 基于Python初探Linux下的僵尸进程和孤儿进程(一)
date: 2018-06-07 19:34:16
tags:
- Python
- Linux
- 多进程
---

*通过对比子父进程的执行周期来详细讨论僵尸进程产生的原因和规避方法*

<!-- more -->

样例代码如下所示：

```python
# -*- coding: utf-8 -*-
import multiprocessing
import os
import time


class MainProcess:
    def __init__(self, main_process_time, child_process_time):
        self.main_process_time = main_process_time
        self.child_process_time = child_process_time

    def excutor(self):
        print('main process begin, pid={0}, ppid={1}'.format(os.getpid(), os.getppid()))
        p = ChildProcess(self.child_process_time)
        p.start()
        p.join()
        for i in range(self.main_process_time):
            print('main process, pid={0}, ppid={1}, times={2}'.format(os.getpid(), os.getppid(), i))
            time.sleep(1)
        print('main process end, pid={0}, ppid={1}'.format(os.getpid(), os.getppid()))


class ChildProcess(multiprocessing.Process):
    def __init__(self, process_time):
        multiprocessing.Process.__init__(self)
        self.process_time = process_time

    def run(self):
        print('child process begin, pid={0}, ppid={1}'.format(os.getpid(), os.getppid()))
        for i in range(self.process_time):
            print('child process pid={0}, ppid={1}, times={2}'.format(os.getpid(), os.getppid(), i))
            time.sleep(1)
        print('child process end, pid={0}, ppid={1}'.format(os.getpid(), os.getppid()))


if __name__ == '__main__':
    main_process_time = 5
    child_process_time = 10
    action = MainProcess(main_process_time, child_process_time)
    action.excutor()
```

# 业务场景及现象描述

## 场景一：子进程的运行周期大于父进程

### 子进程不调用join()方法：无僵尸进程存在

样例代码中main_process_time代表主进程运行时长，child_process_time代表子进程运行时长；并注释掉p.join()，代码执行逻辑如下所述：

　　父进程执行到p.start()后，子父进程开始同时执行；当父进程结束后，子进程继续执行；此时父进程并不退出依然存在，且进程状态依然为休眠状态(S+)；当子进程结束后，子父进程同时销毁。打印结果如下图所示：

![子进程运行周期长，且不调用join](./子进程运行周期长，且不调用join.png)

### 子进程调用join()方法：无僵尸进程存在

取消p.join()的注释，代码执行逻辑如下所述：

　　首先启动父进程，当执行到p.start()后，子进程开始执行，此时父进程处于挂起状态；当子进程结束后，父进程开始继续执行后续代码。打印结果如下图所示：

![子进程运行周期长，调用无参join](./子进程运行周期长，调用无参join.png)

## 场景二：子进程运行周期小与父进程

### 子进程不调用join()方法：<font color=red>有僵尸进程存在</font>

修改main_process_time为30，child_process_time为10；并注释掉p.join()，代码执行逻辑如下所述：

　　首先启动父进程，当执行到p.start()后，子父进程开始同时执行；<font color=red>当子进程尚未结束时</font>，子父进程的打印结果及其进程状态如下图所示：

![父进程运行周期长，不调用join，且子进程尚未结束](./父进程运行周期长，不调用join，且子进程尚未结束.png)

<font color=red>当子进程结束，但父进程尚未结束时，子进程变为僵尸进程</font>，进程的打印结果和进程状态如下图所示：

![父进程运行周期长，不调用join，且子进程已经结束](./父进程运行周期长，不调用join，且子进程已经结束.png)

### 子进程调用join()方法：无僵尸进程存在

修改main_process_time为30，child_process_time为10；并取消p.join()的注释，代码执行逻辑如下所述：

　　当父进程执行到p.start()后，子进程开始执行，且父进程挂起；当子进程尚未结束时，程序打印结果以及系统中进程状态如下图所示：

![父进程运行周期长，调用无参join，且子进程尚未结束](./父进程运行周期长，调用无参join，且子进程尚未结束.png)

<font color=red>当子进程结束而父进程尚未结束时，子进程正常销毁</font>，此时只有父进程在继续运行;程序打印结果以及系统中进程状态如下图所示：

![父进程运行周期长，调用无参join，且子进程已经结束](./父进程运行周期长，调用无参join，且子进程已经结束.png)

## 子父进程伪并发

　　在写代码的时候，需要注意join()方法位置；否则有可能会导致看似的多进程并发代码，实则的多进程的串行执行。Eg：将样例代码中的MainProcess类的excutor方法改写成如下形式：

![join串行代码写法](./join串行代码写法.png)

　　当基于for循环创建子进程时，若将p.join()卸载循环体内，则实际的执行逻辑为：主线程 => 子线程1 => 子线程2 => 子线程3 => 主线程；代码打印结果如下图所示：

![join串行代码输出结果](./join串行代码输出结果.png)

　　若想基于该写法实现真并发，可将p.join()改写为p.join(0.001)即可；代表着新建子进程后父进程的挂起时间仅为0.001秒，因此可以近似等价于同时执行；执行效果如下图所示：

![join并行输出结果](./join并行输出结果.png)

不过不建议采用这样的写法，因为这样会产生僵尸进程(详见[join详解](https://yhyr.github.io/2018/06/06/%E5%9F%BA%E4%BA%8EPython%E5%88%9D%E6%8E%A2Linux%E4%B8%8B%E7%9A%84%E5%83%B5%E5%B0%B8%E8%BF%9B%E7%A8%8B%E5%92%8C%E5%AD%A4%E5%84%BF%E8%BF%9B%E7%A8%8B-%E4%BA%8C/))。

# Linux进程基本概念

　　在Linux中，默认情况下当父进程创建完子进程后，子父进程的运行是相互独立的、异步的；即父进程无法感知到子进程何时结束。为了让父进程可以在任意时刻都能获取到子进程结束时的状态信息，提供了如下机制：

- 1) 当子进程结束后，系统在释放该子进程的所有资源的同时(eg：占用的内存、打开的文件等)，仍会保留一定的信息，包括进程号(process id)，进程的退出状态(the termination status of the process)，运行时间(the amount of CPU time taken by the process)等。
- 2) 当父进程调用wait/waitpid方法获取子进程的退出状态信息后，系统会彻底释放掉对应子进程的所有信息。如果父进程没有调用wait/waitpid方法，且父进程一直存活，则该子进程所有用的端口号信息一直保存，从而该子进程变为僵尸进程(对系统有害)；若父进程没有调用wait/waitpid方法，且父进程已经结束，则子进程会从僵尸进程转变为孤儿进程(对系统无害)。

### 僵尸进程

　　一个进程创建了一个子进程，且当该子进程结束后，父进程没有调用wait/waitpid方法来获取子进程的退出状态信息，那么该子进程将会一直保留在系统中，并持续占有该进程的端口号等信息；进程标识符为`<defunct>`，进程状态位为Z，这种进程称之为僵尸进程。如下图所示：

![僵尸进程](./僵尸进程.png)

### 孤儿进程

　　当父进程退出而子进程还在运行时，这些子进程将会变成孤儿进程。孤儿进程将会init进程统一管理。因为init进程的进程号为1，所以所有的孤儿进程的父进程号均为1；此外，因为init进程会主动收集所有子进程的退出状态信息，所有由init进程管理的子进程是不会变成僵尸进程。因此，孤儿进程是对系统无害的。

　　例如：在上述样例代码的基础上，将子父进程的运行周期均扩大为60(保证有足够的时间去手动kill掉父进程，方便举例验证)，当子父进程运行的同时，手动kill掉父进程，子进程的进程号变化如下图所示

kill前：

![孤儿进程手动kill前](./孤儿进程手动kill前.png)

kill后：

![孤儿进程手动kill后](./孤儿进程手动kill后.png)

# 总结

　　Linux中，如果父进程正常结束的同时，子进程还未结束，此时父进程并不会退出让子进程变成孤儿进程，而是会有一个等待的操作；以阻塞或者轮询的方式等待所有子进程的结束而结束，毕竟“爸爸管儿子是天经地义的事”；正因为如此，在该应用场景一下(子进程的运行周期大于父进程)，即使不调用join()方法，也不会存在僵尸进程。如果在父进程在执行过程中因为调用os.exit()或者外部直接kill掉，此处父进程就不会在管理自己所产生的子进程，从而会导致子进程变成孤儿进程。相反如果子进程结束时父进程还未结束，此时如果未调用join()方法，则会因为父进程没有获取并处理子进程的退出信息而导致子进程变成僵尸进程；如果父进程一直存在，则该僵尸进程也会一直存在，相反如果父进程结束，则父进程在结束的前会等待并清除自己所产生的所有子进程的退出信息，从而消除僵尸进程。

　　通过上述demo，可以看出在不加join的时候，子父进程的运行方式是一种真正意义上的并行，但是由于特定的场景会导致出现僵尸进程；而加了join后，可以有效的消除僵尸进程，但是所写的多进程代码实则是一种多进程的串行执行模式(即：父进程会等待子进程结束后在执行)，其实是因为join()方法本身就是一种以阻塞主进程来等待子进程的方法。关于join()的解释和切实有效的消除僵尸进程可详见[传送门](https://yhyr.github.io/2018/06/06/%E5%9F%BA%E4%BA%8EPython%E5%88%9D%E6%8E%A2Linux%E4%B8%8B%E7%9A%84%E5%83%B5%E5%B0%B8%E8%BF%9B%E7%A8%8B%E5%92%8C%E5%AD%A4%E5%84%BF%E8%BF%9B%E7%A8%8B-%E4%BA%8C/)